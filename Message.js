const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Self-contained — no external model file dependency
const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: String, required: true },
  licensePlate: { type: String, default: '' },
  vin: { type: String, default: '' },
  color: { type: String, default: '' },
  mileage: { type: Number },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}));

// GET /api/vehicles/my
router.get('/my', auth, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/vehicles
router.post('/', auth, async (req, res) => {
  try {
    const vehicle = new Vehicle({ ...req.body, owner: req.user._id });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/vehicles/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/vehicles/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ message: 'Vehicle deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
