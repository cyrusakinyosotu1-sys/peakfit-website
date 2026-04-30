require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== IN-MEMORY STORAGE =====
const inquiries = [];
const users = [];

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
      send: async (data) => ({ id: 'mock-' + Date.now(), status: 'sent' })
    }
  };
}

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// ===== CONTACT FORM =====
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'All fields required' });
    inquiries.unshift({ id: Date.now(), name, email, message, created_at: new Date().toISOString() });
    await resend.emails.send({ from: process.env.EMAIL_FROM, to: process.env.EMAIL_TO, subject: `🔥 New Inquiry from ${name}`, html: `<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Message:</b><br>${message.replace(/\n/g, '<br>')}</p>` });
    res.json({ success: true, message: 'Inquiry received!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process inquiry' });
  }
});

// ===== AUTH ROUTES =====
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already exists' });
  users.push({ id: Date.now(), name, email, password, created_at: new Date().toISOString() });
  res.json({ success: true, message: 'Account created' });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ success: true, user: { name: user.name, email: user.email } });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Invalid token' });
  const user = users.find(u => `user_${u.id}` === token);
  if (!user) return res.status(401).json({ error: 'Session expired' });
  res.json({ success: true, user: { name: user.name, email: user.email } });
});

// ===== ADMIN ROUTES (Inquiries + Users) =====
app.get('/api/admin/inquiries', (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  res.json(inquiries);
});

app.get('/api/admin/users', (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  res.json(users);
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin.html')));

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(` Admin: /admin | Auth: /api/login | /api/signup`);
});