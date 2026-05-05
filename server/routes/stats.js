import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  // 今日入住
  const todayCheckin = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE check_in = ? AND status != 'cancelled'`).get(today).c;
  
  // 明日入住
  const tomorrowCheckin = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE check_in = ? AND status != 'cancelled'`).get(tomorrow).c;
  
  // 今日离店
  const todayCheckout = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE check_out = ? AND status != 'cancelled'`).get(today).c;
  
  // 在住房间数
  const inHouse = db.prepare(`SELECT COUNT(DISTINCT room_no) as c FROM orders WHERE ? >= check_in AND ? < check_out AND status != 'cancelled'`).get(today, today).c;
  
  // 今日收入
  const todayRevenue = db.prepare(`SELECT COALESCE(SUM(total_price), 0) as s FROM orders WHERE check_in = ? AND status != 'cancelled'`).get(today).s;
  
  // 本月收入
  const monthStart = today.substring(0, 7) + '-01';
  const monthRevenue = db.prepare(`SELECT COALESCE(SUM(total_price), 0) as s FROM orders WHERE check_in >= ? AND check_in <= ? AND status != 'cancelled'`).get(monthStart, today).s;
  
  // 待入住订单
  const upcomingOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE check_in >= ? AND status IN ('pending', 'confirmed')`).get(today).c;
  
  // 总房间数
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms WHERE status = ?').get('active').c;
  
  res.json({
    todayCheckin, tomorrowCheckin, todayCheckout, inHouse, 
    todayRevenue, monthRevenue, upcomingOrders, totalRooms,
    occupancyRate: totalRooms > 0 ? Math.round((inHouse / totalRooms) * 100) : 0
  });
});

// 月度统计
router.get('/monthly', (req, res) => {
  const { year, month } = req.query;
  const start = `${year || new Date().getFullYear()}-${String(month || new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const [y, m] = start.split('-');
  const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
  const end = `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`;
  
  const daily = db.prepare(`
    SELECT check_in as date, COUNT(*) as orders, COALESCE(SUM(total_price), 0) as revenue
    FROM orders WHERE check_in >= ? AND check_in <= ? AND status != 'cancelled'
    GROUP BY check_in ORDER BY check_in
  `).all(start, end);
  
  const total = db.prepare(`
    SELECT COUNT(*) as orders, COALESCE(SUM(total_price), 0) as revenue, COALESCE(SUM(nights), 0) as nights
    FROM orders WHERE check_in >= ? AND check_in <= ? AND status != 'cancelled'
  `).get(start, end);
  
  res.json({ daily, total, start, end });
});

// 渠道统计
router.get('/channels', (req, res) => {
  const { start, end } = req.query;
  const where = start && end ? 'WHERE o.check_in >= ? AND o.check_in <= ? AND o.status != ?' : 'WHERE o.status != ?';
  const params = start && end ? [start, end, 'cancelled'] : ['cancelled'];
  
  const stats = db.prepare(`
    SELECT c.name, c.color, c.id as channel_id, 
           COUNT(o.id) as order_count, 
           COALESCE(SUM(o.total_price), 0) as revenue
    FROM channels c
    LEFT JOIN orders o ON o.channel_id = c.id ${where}
    GROUP BY c.id ORDER BY revenue DESC
  `).all(...params);
  
  res.json({ stats });
});

export default router;
