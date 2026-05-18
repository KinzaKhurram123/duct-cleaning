const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const Booking = require('./models/Booking');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (your HTML)
app.use(express.static(__dirname));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
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

// Get all bookings (Admin endpoint)
app.get('/api/bookings', async (req, res) => {
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
app.get('/api/bookings/:id', async (req, res) => {
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
      subject: '🎯 New Booking Request - PureFlow Systems',
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
              <p>PureFlow Systems</p>
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
                <p>PureFlow Systems - Elite Air Purification</p>
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
      subject: '✅ Booking Confirmation - PureFlow Systems',
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
              <p>Thank you for choosing PureFlow Systems</p>
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
                <p>PureFlow Systems - Elite Air Purification</p>
                <p>Hospital-grade duct sanitization for sophisticated living spaces</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(customerMailOptions);

    console.log('✅ Emails sent successfully');

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
app.patch('/api/bookings/:id/status', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📧 Email service configured with: ${process.env.EMAIL_USER}`);
  console.log(`💾 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
});
