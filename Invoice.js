const express = require('express');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get messages for a room
router.get('/:roomId', auth, async (req, res) => {
  try {
    const msgs = await Message.find({ roomId: req.params.roomId }).sort({ createdAt: 1 }).limit(100);
    res.json(msgs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Save message
router.post('/', auth, async (req, res) => {
  try {
    const msg = new Message({
      roomId: req.body.roomId,
      message: req.body.message,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role
    });
    await msg.save();
    res.status(201).json(msg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark room as read
router.put('/:roomId/read', auth, async (req, res) => {
  try {
    await Message.updateMany({ roomId: req.params.roomId, sender: { $ne: req.user._id } }, { read: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// All rooms with last message (owner)
router.get('/rooms/all', auth, async (req, res) => {
  try {
    const rooms = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$roomId', lastMessage: { $first: '$$ROOT' }, unread: { $sum: { $cond: ['$read', 0, 1] } } } },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);
    res.json(rooms);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
