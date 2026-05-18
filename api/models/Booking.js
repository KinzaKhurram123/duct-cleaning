const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  service: {
    type: String,
    required: true,
    enum: [
      'Air Duct Cleaning',
      'Dryer Vent Cleaning',
      'Air Vent Cleaning',
      'Deep Air Vent Cleaning',
      'Furnace Cleaning'
    ]
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
bookingSchema.index({ email: 1 });
bookingSchema.index({ submittedAt: -1 });
bookingSchema.index({ city: 1 });
bookingSchema.index({ zipCode: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
