import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// 房间列表
router.get('/', (req, res) => {
  const rooms = db.prepare(`
    SELECT r.*, rt.name as type_name, rt.base_price 
    FROM rooms r 
    LEFT JOIN room_types rt ON r.room_type_id = rt.id 
    WHERE r.status = 'active'
    ORDER BY r.floor, r.room_no
  `).all();
  res.json({ rooms });
});

// 房型列表
router.get('/types', (req, res) => {
  const types = db.prepare('SELECT * FROM room_types ORDER BY id').all();
  res.json({ types });
});

// 添加/编辑房间
router.post('/', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  const { room_no, room_type_id, floor } = req.body;
  if (!room_no) return res.status(400).json({ error: '房间号不能为空' });
  try {
    if (req.body.id) {
      db.prepare('UPDATE rooms SET room_no=?, room_type_id=?, floor=? WHERE id=?').run(room_no, room_type_id, floor, req.body.id);
      res.json({ ok: true });
    } else {
      const result = db.prepare('INSERT INTO rooms (room_no, room_type_id, floor) VALUES (?, ?, ?)').run(room_no, room_type_id || null, floor || 2);
      res.json({ ok: true, id: result.lastInsertRowid });
    }
  } catch (e) {
    res.status(400).json({ error: '房间号已存在' });
  }
});

// 删除房间
router.delete('/:id', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
