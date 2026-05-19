# Pacific Duct Systems - Backend Setup Guide

## 📋 Prerequisites

- Node.js (v14 or higher) installed
- Gmail account (or any SMTP email service)
- Basic knowledge of terminal/command prompt

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Node.js Dependencies

Open terminal in the `DuctCleaning` folder and run:

```bash
npm install
```

This will install all required packages:
- express (web server)
- nodemailer (email sending)
- cors (cross-origin requests)
- body-parser (form data parsing)
- dotenv (environment variables)

---

### Step 2: Configure Email Settings

1. **Open `.env` file** in the project folder

2. **For Gmail Users:**
   - Go to: https://myaccount.google.com/apppasswords
   - Enable 2-Step Verification first
   - Generate an "App Password" for "Mail"
   - Copy the 16-character password

3. **Update `.env` file:**

```env
PORT=3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  # Your App Password (remove spaces)
ADMIN_EMAIL=admin@Pacific Duct.com   # Where bookings will be sent
```

**Example:**
```env
PORT=3000
EMAIL_USER=Pacific Duct@gmail.com
EMAIL_PASS=abcdwxyzpqrs1234
ADMIN_EMAIL=Pacific Duct@gmail.com
```

---

### Step 3: Start the Server

Run this command:

```bash
npm start
```

You should see:
```
🚀 Server is running on http://localhost:3000
📧 Email service configured with: your-email@gmail.com
```

---

### Step 4: Test the Backend

Open your browser and go to:
```
http://localhost:3000/api/test
```

You should see:
```json
{"message": "Backend is working!"}
```

---

## 📧 Email Services Supported

### Gmail (Recommended)
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Outlook/Hotmail
```env
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo Mail
```env
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

### Custom SMTP
Edit `server.js` and replace the transporter configuration:
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.yourdomain.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

---

## 🧪 Testing the Form

1. **Start the server:** `npm start`
2. **Open:** `code.html` in your browser
3. **Fill the booking form** and submit
4. **Check your email** - you should receive:
   - Admin notification (booking details)
   - Customer confirmation email

---

## 🔧 Development Mode

For auto-restart on file changes:

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when you make changes.

---

## 📁 Project Structure

```
DuctCleaning/
├── server.js           # Main backend server
├── code.html           # Frontend website
├── package.json        # Dependencies
├── .env               # Environment variables (SECRET - don't share!)
├── .env.example       # Example environment file
├── .gitignore         # Git ignore file
└── README.md          # This file
```

---

## 🐛 Troubleshooting

### Error: "Invalid login credentials"
- Make sure you're using an **App Password**, not your regular Gmail password
- Enable 2-Step Verification in Gmail first

### Error: "Port 3000 already in use"
- Change `PORT=3000` to `PORT=3001` in `.env` file
- Update the form URL in `code.html` accordingly

### Emails not sending
- Check your `.env` file has correct credentials
- Make sure there are no extra spaces in EMAIL_PASS
- Try sending a test email from Gmail web to verify account works

### CORS errors
- Make sure server is running on `http://localhost:3000`
- Check browser console for specific error messages

---

## 🚀 Deployment Options

### Option 1: Heroku (Free Tier Available)
1. Create Heroku account
2. Install Heroku CLI
3. Run: `heroku create Pacific Duct-backend`
4. Set environment variables in Heroku dashboard
5. Deploy: `git push heroku main`

### Option 2: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard

### Option 3: Railway
1. Go to railway.app
2. Connect GitHub repository
3. Add environment variables
4. Deploy automatically

---

## 📞 Support

If you need help:
1. Check the troubleshooting section above
2. Verify all environment variables are correct
3. Check server logs for error messages

---

## 🔒 Security Notes

- **Never commit `.env` file to Git**
- Use App Passwords, not regular passwords
- Keep your EMAIL_PASS secret
- Use HTTPS in production

---

## ✅ Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with email credentials
- [ ] Server starts successfully (`npm start`)
- [ ] Test endpoint works (`/api/test`)
- [ ] Form submission works
- [ ] Emails received successfully

---

**Made with ❤️ for Pacific Duct Systems**
