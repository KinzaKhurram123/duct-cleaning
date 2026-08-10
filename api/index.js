const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const Booking = require('./models/Booking');
const Admin = require('./models/Admin');
const Content = require('./models/Content');
const { requireAdmin, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// FRONTEND_URL can be a single URL or a comma-separated list (e.g. website + admin panel domains)
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server) and local dev (file://, localhost)
    if (!origin || origin === 'null' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(express.static('public')); // Frontend is deployed separately

// Default admin login (hardcoded as requested)
const DEFAULT_ADMIN_USERNAME = 'admin@pacific.duct';
const DEFAULT_ADMIN_PASSWORD = '12345678';

async function ensureDefaultAdmin() {
  try {
    const existing = await Admin.findOne({ username: DEFAULT_ADMIN_USERNAME });
    if (!existing) {
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await Admin.create({ username: DEFAULT_ADMIN_USERNAME, passwordHash });
      console.log(`✅ Default admin created: ${DEFAULT_ADMIN_USERNAME}`);
    }
  } catch (err) {
    console.error('❌ Failed to ensure default admin:', err.message);
  }
}

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  ensureDefaultAdmin();
})
.catch((err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use other services like 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS  // Your email password or app password
  }
});

  // Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: admin._id, username: admin.username }, JWT_SECRET, {
      expiresIn: '12h'
    });

    res.json({ success: true, token, username: admin.username });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Verify current token / session
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ success: true, username: req.admin.username });
});

// ---- CMS: site content (public read, admin write) ----

async function getOrCreateContent() {
  let content = await Content.findOne({ key: 'site' });
  if (!content) {
    content = await Content.create({ key: 'site' });
  }
  return content;
}

// Public: website reads content here
app.get('/api/content', async (req, res) => {
  try {
    const content = await getOrCreateContent();
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch content' });
  }
});

// Admin: update content (full or partial sections)
app.put('/api/content', requireAdmin, async (req, res) => {
  try {
    const allowedFields = ['hero', 'contact', 'services', 'testimonials', 'pricing'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const content = await Content.findOneAndUpdate(
      { key: 'site' },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({ success: true, content });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ success: false, message: 'Failed to update content' });
  }
});

// Get all bookings (Admin endpoint)
app.get('/api/bookings', requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ submittedAt: -1 }).limit(50);
    res.json({
      success: true,
      count: bookings.length,
      bookings: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

// Get booking by ID
app.get('/api/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    res.json({
      success: true,
      booking: booking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
});

// Form submission endpoint
app.post('/api/submit-booking', async (req, res) => {
  try {
    const { name, service, email, phone, address, city, state, zipCode, message } = req.body;

    // Validation
    if (!name || !service || !email || !phone || !address || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Save to MongoDB
    const newBooking = new Booking({
      name,
      service,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      message: message || '',
      ipAddress
    });

    const savedBooking = await newBooking.save();
    console.log('✅ Booking saved to database:', savedBooking._id);

    // Full address for display
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

    // Email content for admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: '🎯 New Booking Request - Pacific Duct Systems',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #003366 0%, #001e40 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .field { margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #003366; }
            .label { font-weight: bold; color: #003366; margin-bottom: 5px; }
            .value { color: #555; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
            .booking-id { background: #1facb6; color: white; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Booking Request</h1>
              <p>Pacific Duct Systems</p>
            </div>
            <div class="content">
              <div class="booking-id">
                <strong>Booking ID:</strong> ${savedBooking._id}
              </div>
              <div class="field">
                <div class="label">👤 Customer Name:</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">🛠️ Service Requested:</div>
                <div class="value">${service}</div>
              </div>
              <div class="field">
                <div class="label">📧 Email:</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              <div class="field">
                <div class="label">📱 Phone:</div>
                <div class="value"><a href="tel:${phone}">${phone}</a></div>
              </div>
              <div class="field">
                <div class="label">📍 Service Address:</div>
                <div class="value">
                  ${address}<br>
                  ${city}, ${state} ${zipCode}
                </div>
              </div>
              ${message ? `
              <div class="field">
                <div class="label">💬 Additional Message:</div>
                <div class="value">${message}</div>
              </div>
              ` : ''}
              <div class="footer">
                <p>Received on ${new Date().toLocaleString()}</p>
                <p>Status: <strong>Pending</strong></p>
                <p>Pacific Duct Systems - Elite Air Purification</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Email content for customer (confirmation)
    const customerMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '✅ Booking Confirmation - Pacific Duct Systems',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #003366 0%, #001e40 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background: #003366; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .booking-ref { background: #1facb6; color: white; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed!</h1>
              <p>Thank you for choosing Pacific Duct Systems</p>
            </div>
            <div class="content">
              <div class="booking-ref">
                <strong>Your Booking Reference:</strong><br>
                ${savedBooking._id}
              </div>
              <div class="message">
                <h2>Hello ${name},</h2>
                <p>Thank you for your booking request! We've received your information and our team will contact you shortly to confirm your appointment.</p>

                <h3>Your Booking Details:</h3>
                <p><strong>Service:</strong> ${service}</p>
                <p><strong>Service Address:</strong><br>
                ${address}<br>
                ${city}, ${state} ${zipCode}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}

                <p>Our team typically responds within 24 hours during business days.</p>

                <p>If you have any urgent questions, please don't hesitate to contact us directly.</p>
              </div>
              <div class="footer">
                <p>Pacific Duct Systems - Elite Air Purification</p>
                <p>Hospital-grade duct sanitization for sophisticated living spaces</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send emails (best-effort — a booking is still valid even if email delivery fails,
    // e.g. EMAIL_USER/EMAIL_PASS not configured yet)
    try {
      await transporter.sendMail(adminMailOptions);
      await transporter.sendMail(customerMailOptions);
      console.log('✅ Emails sent successfully');
    } catch (emailError) {
      console.error('⚠️ Booking saved but email failed to send:', emailError.message);
    }

    // Success response
    res.json({
      success: true,
      message: 'Booking request submitted successfully!',
      bookingId: savedBooking._id
    });

  } catch (error) {
    console.error('Error processing booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process booking. Please try again later.'
    });
  }
});

// Update booking status (Admin endpoint)
app.patch('/api/bookings/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated',
      booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    });
  }
});

module.exports = app;

// If this file is run directly, start the server for local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running for local development on http://localhost:${PORT}`);
  });
}
