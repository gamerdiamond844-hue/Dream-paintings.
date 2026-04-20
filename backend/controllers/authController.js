const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../config/db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields required' });
  if (!['user', 'artist'].includes(role))
    return res.status(400).json({ message: 'Invalid role' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role, avatar_url',
      [name, email, hash, role]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    // Block password login for Google-only accounts
    if (user.auth_provider === 'google' && !user.password)
      return res.status(401).json({ message: 'This account uses Google Sign-In. Please continue with Google.' });
    if (!user.password || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    if (user.is_banned)
      return res.status(403).json({ message: 'Your account has been banned' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const googleAuth = async (req, res) => {
  // Check DB setting first, fall back to env var
  const settingRow = await pool.query("SELECT value FROM settings WHERE key='google_auth_enabled'").catch(() => ({ rows: [] }));
  const isEnabled = settingRow.rows.length
    ? settingRow.rows[0].value !== 'false'
    : process.env.GOOGLE_AUTH_ENABLED !== 'false';
  if (!isEnabled) return res.status(403).json({ message: 'Google login is currently disabled.' });

  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });

  try {
    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) return res.status(400).json({ message: 'Could not retrieve email from Google account' });

    // Check if user exists by google_id or email
    let result = await pool.query('SELECT * FROM users WHERE google_id=$1 OR email=$2', [googleId, email]);
    let user = result.rows[0];

    if (user) {
      if (user.is_banned) return res.status(403).json({ message: 'Your account has been banned' });
      // Link google_id if signing in via email match for the first time
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id=$1, auth_provider=$2, avatar_url=COALESCE(avatar_url,$3) WHERE id=$4',
          [googleId, 'google', picture, user.id]
        );
        user.google_id = googleId;
        user.auth_provider = 'google';
        if (!user.avatar_url) user.avatar_url = picture;
      }
    } else {
      // Auto-create new account
      const insertResult = await pool.query(
        'INSERT INTO users (name, email, google_id, auth_provider, avatar_url, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [name, email, googleId, 'google', picture, 'user']
      );
      user = insertResult.rows[0];
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Invalid or expired Google token' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url, bio, is_banned, is_master_artist, is_verified, badge_level, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });
    if (result.rows[0].is_banned) return res.status(403).json({ message: 'Account banned' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, bio } = req.body;
  const avatar_url = req.file?.path;
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (name) { fields.push(`name=$${idx++}`); values.push(name); }
    if (bio !== undefined) { fields.push(`bio=$${idx++}`); values.push(bio); }
    if (avatar_url) { fields.push(`avatar_url=$${idx++}`); values.push(avatar_url); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx} RETURNING id, name, email, role, avatar_url, bio`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, googleAuth, getMe, updateProfile };
