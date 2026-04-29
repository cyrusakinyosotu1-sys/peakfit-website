require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== DATABASE SETUP =====
const db = new Database(path.join(__dirname, 'inquiries.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ SQLite database initialized');

// ===== EMAIL SERVICE =====
let resend;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend initialized (Real Email)');
} else {
  console.warn('⚠️ Using mock email service');
  resend = {
    emails: {
      send: async (data) => {
        console.log('📧 [MOCK] To:', data.to, '| Subject:', data.subject);
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
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Save to database
    const stmt = db.prepare('INSERT INTO inquiries (name, email, message) VALUES (?, ?, ?)');
    stmt.run(name, email, message);

    // Send email
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: ` New Inquiry from ${name}`,
      html: `<h3>New Contact Form Submission</h3><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Message:</b><br>${message.replace(/\n/g, '<br>')}</p>`
    });

    console.log(`✅ Saved & emailed inquiry from ${name}`);
    res.status(200).json({ success: true, message: 'Inquiry received!' });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Failed to process inquiry' });
  }
});

// ===== ADMIN API (Password Protected) =====
app.get('/api/admin/inquiries', (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const rows = db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all();
  res.json(rows);
});

// ===== ADMIN PAGE ROUTE =====
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔑 Admin panel: http://localhost:${PORT}/admin`);
});