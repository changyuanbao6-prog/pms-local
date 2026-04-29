import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const channels = db.prepare('SELECT * FROM channels ORDER BY id').all();
  res.json({ channels });
});

router.post('/', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  const { name, code, color } = req.body;
  try {
    const result = db.prepare('INSERT INTO channels (name, code, color) VALUES (?, ?, ?)').run(name, code, color || '#409eff');
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: '渠道代码已存在' });
  }
});

router.delete('/:id', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  db.prepare('DELETE FROM channels WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
