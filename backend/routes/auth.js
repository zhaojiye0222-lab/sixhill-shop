const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { JWT_SECRET } = require('../middlewares/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  const { username, password, name, phone, address, ageConfirmed } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields (username, password, name)' });
  }
  if (!ageConfirmed) {
    return res.status(400).json({ error: 'You must confirm you are 21+ to register' });
  }

  try {
    const [existingRows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newId = `u_${Date.now()}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (id, username, password, name, phone, address, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, username, hashedPassword, name, phone || '', address || '', 'user']
    );

    const token = jwt.sign(
      { id: newId, role: 'user', name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: newId, name, role: 'user' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 登录（兼容旧明文密码，自动升级为 bcrypt）
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const isBcryptHash = user.password && user.password.startsWith('$2');
    let passwordMatch = false;

    if (isBcryptHash) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = (user.password === password);
      if (passwordMatch) {
        const hashed = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
