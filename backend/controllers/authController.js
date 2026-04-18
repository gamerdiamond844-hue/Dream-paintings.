const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

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
    if (!user || !(await bcrypt.compare(password, user.password)))
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

module.exports = { register, login, getMe, updateProfile };
