const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'afp_secret_key_2024';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const user = new User({ name, email, password, phone, role: role || 'customer' });
    await user.save();
    const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', auth, (req, res) => res.json({ user: req.user }));

router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { name: req.body.name, phone: req.body.phone }, { new: true }).select('-password');
    res.json({ user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all customers (owner)
router.get('/customers', auth, async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
