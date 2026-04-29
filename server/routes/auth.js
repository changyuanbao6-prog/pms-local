import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';

const router = express.Router();

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.nickname = user.nickname;
  req.session.role = user.role;
  
  res.json({ 
    ok: true, 
    user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role }
  });
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// 获取当前用户
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  res.json({ user: { id: req.session.userId, username: req.session.username, nickname: req.session.nickname, role: req.session.role } });
});

// 修改密码
router.post('/change-password', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: '原密码错误' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.session.userId);
  res.json({ ok: true });
});

// 用户列表（仅管理员）
router.get('/users', (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') return res.status(403).json({ error: '无权限' });
  const users = db.prepare('SELECT id, username, nickname, role, created_at FROM users').all();
  res.json({ users });
});

// 添加用户
router.post('/users', (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') return res.status(403).json({ error: '无权限' });
  const { username, password, nickname, role } = req.body;
  const hash = bcrypt.hashSync(password || '123456', 10);
  try {
    const result = db.prepare('INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)').run(username, hash, nickname || '', role || 'staff');
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: '用户名已存在' });
  }
});

export default router;
