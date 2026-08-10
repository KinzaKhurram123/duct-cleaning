const mongoose = require('mongoose');

// Singleton document holding all editable website content (CMS)
const contentSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'site',
    unique: true
  },
  hero: {
    title: { type: String, default: 'Hospital-Grade Air Duct Cleaning' },
    subtitle: { type: String, default: 'Elite air purification for sophisticated living spaces.' }
  },
  contact: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  services: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    price: { type: String, default: '' },
    priceLabel: { type: String, default: 'Starting from' },
    cta: { type: String, default: 'Book Now' },
    gradient: { type: String, default: '' }
  }],
  testimonials: [{
    name: { type: String, required: true },
    role: { type: String, default: '' },
    quote: { type: String, required: true }
  }],
  pricing: [{
    name: { type: String, required: true },
    price: { type: String, default: '' },
    description: { type: String, default: '' }
  }]
}, {
  timestamps: true
});

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;
