const express = require('express');
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Simulate payment processing
router.post('/pay', auth, async (req, res) => {
  try {
    const { invoiceId, method, cardLast4 } = req.body;
    // In production: integrate Stripe here
    // const paymentIntent = await stripe.paymentIntents.create({...})
    
    const invoice = await Invoice.findOneAndUpdate(
      { _id: invoiceId, customer: req.user._id },
      {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: method || 'online',
        notes: `Payment processed${cardLast4 ? ` via card ending ${cardLast4}` : ''}`
      },
      { new: true }
    );

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json({
      success: true,
      transactionId: 'TXN-' + Date.now(),
      invoice,
      message: 'Payment processed successfully'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
