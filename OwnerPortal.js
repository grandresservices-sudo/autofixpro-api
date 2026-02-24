const mongoose = require('mongoose');

const repairNoteSchema = new mongoose.Schema({
  text: String,
  author: String,
  createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: {
    make: String, model: String, year: String,
    licensePlate: String, color: String, mileage: String, vin: String
  },
  service: { type: String, required: true },
  serviceType: { type: String, default: 'maintenance' }, // maintenance, repair, inspection, emergency
  description: String,
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  duration: { type: Number, default: 60 }, // minutes
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{ status: String, timestamp: { type: Date, default: Date.now }, note: String }],
  mechanic: String,
  bay: String,
  estimatedCost: Number,
  finalCost: Number,
  repairNotes: [repairNoteSchema],
  parts: [{ name: String, cost: Number, quantity: Number }],
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

appointmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
