// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitize(user) {
  const { password_hash, reset_token, reset_expires, ...safe } = user;
  return safe;
}

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const countRes = await pool.query('SELECT COUNT(*) AS c FROM users');
    const empCode = 'EMP-' + String(parseInt(countRes.rows[0].c, 10) + 1).padStart(3, '0');

    const insertRes = await pool.query(
      `INSERT INTO users (emp_code, name, email, password_hash, role, join_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING id`,
      [empCode, name, email, hash, role || 'Employee']
    );
    const rows = await pool.query('SELECT * FROM users WHERE id = $1', [insertRes.rows[0].id]);
    const user = rows.rows[0];
    res.status(201).json({ message: 'Account created successfully.', user: sanitize(user), token: signToken(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating account.' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ message: 'Invalid email or password.' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    res.json({ message: 'Login successful.', user: sanitize(user), token: signToken(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await pool.query('UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3', [token, expires, email]);

    res.json({ message: 'Reset token generated.', resetToken: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating reset token.' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()', [token]
    );
    if (!result.rows.length) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, result.rows[0].id]
    );
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows.length) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: sanitize(result.rows[0]) });
};

// PUT /api/auth/me
exports.updateMe = async (req, res) => {
  const { name, phone, department, designation, join_date, avatar_url } = req.body;
  await pool.query(
    `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone),
     department = COALESCE($3, department), designation = COALESCE($4, designation),
     join_date = COALESCE($5, join_date), avatar_url = COALESCE($6, avatar_url) WHERE id = $7`,
    [name, phone, department, designation, join_date || null, avatar_url, req.user.id]
  );
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  res.json({ message: 'Profile updated.', user: sanitize(result.rows[0]) });
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return res.status(400).json({ message: 'Current password is incorrect.' });
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  res.json({ message: 'Password updated successfully.' });
};
