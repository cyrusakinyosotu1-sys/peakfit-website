require('dotenv').config();
const { Resend } = require('resend');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve your frontend files
app.use(express.static(path.join(__dirname, '..')));

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: `🔥 New Inquiry from ${name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0044cc;">New Contact Form Submission</h2>
          <hr style="border: none; border-top: 1px solid #eee; margin: 1rem 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 1rem 0;">
          <small style="color: #666;">Sent via PeakFit Website • ${new Date().toLocaleString()}</small>
        </div>
      `
    });

    console.log(`✅ Email sent via Resend: ${data.id}`);
    res.status(200).json({ success: true, message: 'Inquiry received!' });

  } catch (error) {
    console.error('❌ Resend error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`✅ Resend initialized - Ready to send emails`);
});