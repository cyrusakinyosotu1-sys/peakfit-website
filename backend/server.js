require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== EMAIL SERVICE SETUP (Real + Mock Fallback) =====
let resend;

if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
  // Use real Resend when API key is set
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend initialized with real API key');
} else {
  // Mock service for local testing (no API key needed)
  console.warn('⚠️ Using mock email service - set RESEND_API_KEY for real emails');
  resend = {
    emails: {
      send: async (data) => {
        console.log('📧 [MOCK EMAIL]');
        console.log('   To:', data.to);
        console.log('   From:', data.from);
        console.log('   Subject:', data.subject);
        console.log('   Preview:', data.html?.substring(0, 100) + '...');
        return { id: 'mock-' + Date.now(), status: 'sent' };
      }
    }
  };
}

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// ===== CONTACT FORM ENDPOINT =====
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Send email via Resend (real or mock)
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: `🔥 New Inquiry from ${name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0044cc; margin-bottom: 1rem;">New Contact Form Submission</h2>
          <hr style="border: none; border-top: 1px solid #eee; margin: 1rem 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 1rem 0;">
          <small style="color: #666;">Sent via PeakFit Website • ${new Date().toLocaleString()}</small>
        </div>
      `
    });

    console.log(`✅ Email sent: ${data.id}`);
    res.status(200).json({ success: true, message: 'Inquiry received!' });

  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ===== ADMIN ENDPOINT (View Saved Inquiries) =====
app.get('/admin/inquiries', (req, res) => {
  // Note: For a real app, you'd query a database here
  // This is a placeholder that returns mock data
  res.json({
    success: true,
    message: 'Admin endpoint ready. Connect a database to store inquiries.',
    tip: 'Use better-sqlite3 or MongoDB to save form submissions'
  });
});

// ===== HEALTH CHECK (For Render) =====
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`✅ Environment: ${process.env.RESEND_API_KEY?.startsWith('re_') ? 'Production (Real Email)' : 'Development (Mock Email)'}`);
});