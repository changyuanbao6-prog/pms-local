import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// 检查房间冲突
function checkConflict(room_no, check_in, check_out, excludeId = null) {
  const sql = excludeId 
    ? `SELECT * FROM orders WHERE room_no = ? AND status != 'cancelled' AND id != ? AND NOT (check_out <= ? OR check_in >= ?)`
    : `SELECT * FROM orders WHERE room_no = ? AND status != 'cancelled' AND NOT (check_out <= ? OR check_in >= ?)`;
  const params = excludeId ? [room_no, check_in, check_out, excludeId] : [room_no, check_in, check_out];
  return db.prepare(sql).get(...params);
}

// 订单列表（支持日期范围和筛选）
router.get('/', (req, res) => {
  const { start, end, room_no, channel_id, status, page = 1, pageSize = 50 } = req.query;
  
  let where = [];
  let params = [];
  
  if (start) { where.push('check_in >= ?'); params.push(start); }
  if (end) { where.push('check_out <= ?'); params.push(end); }
  if (room_no) { where.push('room_no = ?'); params.push(room_no); }
  if (channel_id) { where.push('channel_id = ?'); params.push(parseInt(channel_id)); }
  if (status) { where.push('status = ?'); params.push(status); }
  
  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
  
  const total = db.prepare(`SELECT COUNT(*) as c FROM orders ${whereSQL}`).get(...params).c;
  const orders = db.prepare(`
    SELECT o.*, c.name as channel_name, c.color as channel_color
    FROM orders o 
    LEFT JOIN channels c ON o.channel_id = c.id 
    ${whereSQL} 
    ORDER BY o.check_in DESC 
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
  
  res.json({ orders, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// 获取单个订单
router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, c.name as channel_name, c.color as channel_color
    FROM orders o 
    LEFT JOIN channels c ON o.channel_id = c.id 
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json({ order });
});

// 创建订单
router.post('/', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  
  const { guest_name, guest_phone, room_no, room_type_name, check_in, check_out, nights, channel_id, channel_name, channel_order_no, total_price, daily_price, payment_method, notes } = req.body;
  
  if (!guest_name || !room_no || !check_in || !check_out) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  
  // 检查冲突
  const conflict = checkConflict(room_no, check_in, check_out);
  if (conflict) {
    return res.status(400).json({ error: `房间${room_no}在${check_in}至${check_out}期间已被预订`, conflict: true });
  }
  
  const result = db.prepare(`
    INSERT INTO orders (guest_name, guest_phone, room_no, room_type_name, check_in, check_out, nights, channel_id, channel_name, channel_order_no, total_price, daily_price, payment_method, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guest_name, guest_phone || '', room_no, room_type_name || '', check_in, check_out, nights || 1, channel_id || null, channel_name || '自来客', channel_order_no || '', total_price || 0, daily_price || 0, payment_method || '当面结', notes || '', req.session.userId);
  
  res.json({ ok: true, id: result.lastInsertRowid });
});

// 更新订单
router.put('/:id', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  
  const { guest_name, guest_phone, room_no, room_type_name, check_in, check_out, nights, channel_id, channel_name, channel_order_no, total_price, daily_price, payment_method, notes, status } = req.body;
  
  // 检查冲突（排除自己）
  const conflict = checkConflict(room_no, check_in, check_out, parseInt(req.params.id));
  if (conflict) {
    return res.status(400).json({ error: `房间${room_no}在${check_in}至${check_out}期间已被其他订单占用`, conflict: true });
  }
  
  db.prepare(`
    UPDATE orders SET 
      guest_name=?, guest_phone=?, room_no=?, room_type_name=?, check_in=?, check_out=?, nights=?,
      channel_id=?, channel_name=?, channel_order_no=?, total_price=?, daily_price=?, payment_method=?, notes=?, status=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(guest_name, guest_phone || '', room_no, room_type_name || '', check_in, check_out, nights || 1,
    channel_id || null, channel_name || '自来客', channel_order_no || '', total_price || 0, daily_price || 0,
    payment_method || '当面结', notes || '', status || 'confirmed', req.params.id);
  
  res.json({ ok: true });
});

// =============================================
// GET /:id/order-payment
// 获取指定订单的支付信息
// =============================================
router.get('/:id/order-payment', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  const order = db.prepare('SELECT id, guest_name, room_no, total_price, payment_status, pay_no, paid_at FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json({ order });
});

// =============================================
// POST /:id/request-payment
// 为订单发起模拟支付（生成支付单）
// =============================================
router.post('/:id/request-payment', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.payment_status === 'paid') return res.status(400).json({ error: '该订单已支付' });

  const { method } = req.body;
  const payNo = `PMS${Date.now()}${order.id}`;
  const qrcodeData = `mock://pay?pay_no=${payNo}&amount=${order.total_price}&method=${method || 'wechat_scan'}`;

  // 记录支付单
  db.prepare(`
    INSERT OR REPLACE INTO payments (order_id, pay_no, method, amount, status, qrcode_url, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
  `).run(order.id, payNo, method || 'wechat_scan', order.total_price, qrcodeData);

  // 更新订单支付单号
  db.prepare(`UPDATE orders SET pay_no = ?, payment_status = 'pending' WHERE id = ?`).run(payNo, req.params.id);

  res.json({ ok: true, pay_no: payNo, qrcode_url: qrcodeData, expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
});

// =============================================
// POST /:id/confirm-payment
// 模拟回调：确认支付成功（测试用）
// =============================================
router.post('/:id/confirm-payment', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.payment_status === 'paid') return res.status(400).json({ error: '该订单已支付' });

  const tradeNo = `WX${Date.now()}`;

  db.prepare(`
    UPDATE payments SET status = 'success', trade_no = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ? AND status = 'pending'
  `).run(tradeNo, req.params.id);

  db.prepare(`
    UPDATE orders SET payment_status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id);

  res.json({ ok: true, trade_no: tradeNo });
});

// =============================================
// POST /:id/cancel-payment
// 取消支付单
// =============================================
router.post('/:id/cancel-payment', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });

  db.prepare(`UPDATE payments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'pending'`).run(req.params.id);
  db.prepare(`UPDATE orders SET payment_status = 'unpaid', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);

  res.json({ ok: true });
});

// 删除订单
router.delete('/:id', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 房态日历 - 获取某日期范围的订单
router.get('/calendar/:start/:end', (req, res) => {
  const { start, end } = req.params;
  const orders = db.prepare(`
    SELECT * FROM orders 
    WHERE status != 'cancelled' AND NOT (check_out <= ? OR check_in > ?)
    ORDER BY check_in
  `).all(start, end);
  res.json({ orders });
});

export default router;
