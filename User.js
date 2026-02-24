const express = require('express');
const Appointment = require('../models/Appointment');
const { auth, ownerOnly } = require('../middleware/auth');
const router = express.Router();

// Book (customer)
router.post('/', auth, async (req, res) => {
  try {
    const appt = new Appointment({ ...req.body, customer: req.user._id, statusHistory: [{ status: 'pending', note: 'Appointment created' }] });
    await appt.save();
    await appt.populate('customer', 'name email phone');
    res.status(201).json(appt);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// My appointments (customer) - includes repair history
router.get('/my', auth, async (req, res) => {
  try {
    const appts = await Appointment.find({ customer: req.user._id }).sort({ date: -1 });
    res.json(appts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// All appointments (owner) with filters
router.get('/all', auth, ownerOnly, async (req, res) => {
  try {
    const { status, month, year, customerId } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (customerId) filter.customer = customerId;
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }
    const appts = await Appointment.find(filter).sort({ date: 1 }).populate('customer', 'name email phone');
    res.json(appts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Calendar range (owner)
router.get('/calendar', auth, ownerOnly, async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (start && end) filter.date = { $gte: new Date(start), $lte: new Date(end) };
    const appts = await Appointment.find(filter).populate('customer', 'name');
    res.json(appts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update status (owner)
router.put('/:id/status', auth, ownerOnly, async (req, res) => {
  try {
    const { status, notes, estimatedCost, finalCost, mechanic, bay, repairNote } = req.body;
    const update = { status, updatedAt: Date.now() };
    if (notes !== undefined) update.notes = notes;
    if (estimatedCost !== undefined) update.estimatedCost = estimatedCost;
    if (finalCost !== undefined) update.finalCost = finalCost;
    if (mechanic) update.mechanic = mechanic;
    if (bay) update.bay = bay;
    if (status === 'completed') update.completedAt = new Date();

    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        ...update,
        $push: { statusHistory: { status, note: repairNote || notes || `Status updated to ${status}` } }
      },
      { new: true }
    ).populate('customer', 'name email phone');

    if (!appt) return res.status(404).json({ error: 'Not found' });

    // Notify customer via socket
    const io = req.app.get('io');
    io?.to(`customer_${appt.customer._id}`).emit('appointment_updated', {
      appointmentId: appt._id, status, service: appt.service, note: repairNote || notes
    });

    res.json(appt);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add repair note (owner)
router.post('/:id/notes', auth, ownerOnly, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $push: { repairNotes: { text: req.body.text, author: req.user.name } } },
      { new: true }
    );
    res.json(appt);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cancel (customer)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, status: { $in: ['pending', 'confirmed'] } },
      { status: 'cancelled', $push: { statusHistory: { status: 'cancelled', note: 'Cancelled by customer' } } },
      { new: true }
    );
    if (!appt) return res.status(404).json({ error: 'Appointment not found or cannot be cancelled' });
    res.json(appt);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stats (owner)
router.get('/stats', auth, ownerOnly, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [total, pending, confirmed, inProgress, completed, cancelled, today, thisWeek, thisMonth] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'confirmed' }),
      Appointment.countDocuments({ status: 'in-progress' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } }),
      Appointment.countDocuments({ date: { $gte: weekStart } }),
      Appointment.countDocuments({ date: { $gte: monthStart } }),
    ]);

    // Service breakdown
    const serviceBreakdown = await Appointment.aggregate([
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    res.json({ total, pending, confirmed, inProgress, completed, cancelled, today, thisWeek, thisMonth, serviceBreakdown });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
