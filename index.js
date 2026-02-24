const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  items: [{
    description: String,
    category: { type: String, enum: ['labor', 'parts', 'diagnostic', 'other'], default: 'labor' },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 8.5 }, // percent
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  dueDate: Date,
  paidAt: Date,
  paymentMethod: { type: String, enum: ['cash', 'card', 'online', 'check', ''], default: '' },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

invoiceSchema.pre('save', function (next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = 'AFP-' + Date.now().toString().slice(-7);
  }
  this.subtotal = this.items.reduce((s, i) => s + (i.total || 0), 0);
  this.tax = +(this.subtotal * (this.taxRate / 100)).toFixed(2);
  this.total = +(this.subtotal + this.tax - (this.discount || 0)).toFixed(2);
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
