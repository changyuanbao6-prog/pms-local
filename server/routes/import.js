import express from 'express';
import xlsx from 'xlsx';
import { db } from '../db.js';

const router = express.Router();

// 解析Excel文件
function parseExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  return data;
}

// 获取房间ID和名称映射
function getRoomMapping() {
  const rooms = db.prepare('SELECT id, room_no, type_name FROM rooms r LEFT JOIN room_types rt ON r.room_type_id = rt.id').all();
  const byNo = {};
  const byType = {};
  rooms.forEach(r => {
    byNo[r.room_no] = r;
    byType[r.type_name] = byType[r.type_name] || [];
    byType[r.type_name].push(r);
  });
  return { byNo, byType, rooms };
}

// 获取渠道映射
function getChannelMapping() {
  const channels = db.prepare('SELECT id, name, code FROM channels').all();
  const map = {};
  channels.forEach(c => { map[c.name] = c.id; map[c.code] = c.id; });
  return map;
}

// 导入预览（不实际写入）
router.post('/preview', (req, res) => {
  try {
    const { data, source } = req.body; // source: 'ctrip' | 'meituan' | 'douyin'
    
    const channelMap = getChannelMapping();
    const channelId = channelMap[source] || channelMap['walkin'] || 1;
    const channelName = source === 'ctrip' ? '携程' : source === 'meituan' ? '美团' : source === 'douyin' ? '抖音' : '自来客';
    
    const parsed = data.map((row, i) => {
      // 根据不同平台解析字段
      let guest_name = '', guest_phone = '', room_no = '', room_type_name = '', 
          check_in = '', check_out = '', total_price = 0, channel_order_no = '';
      
      // 通用的姓名字段匹配
      const nameFields = ['宾客姓名', '客人姓名', '姓名', 'guest_name', 'name', '预订人', '入住人'];
      for (const f of nameFields) {
        if (row[f]) { guest_name = String(row[f]).trim(); break; }
      }
      
      // 电话
      const phoneFields = ['手机号', '电话', '手机', 'phone', 'tel', '联系电话', '宾客电话'];
      for (const f of phoneFields) {
        if (row[f]) { guest_phone = String(row[f]).trim(); break; }
      }
      
      // 房间号
      const roomFields = ['房号', '房间号', 'room_no', 'room', '房间', '入住房间'];
      for (const f of roomFields) {
        if (row[f]) { room_no = String(row[f]).trim().toUpperCase(); break; }
      }
      
      // 房型
      const typeFields = ['房型', 'room_type', '房型名称', '房型名称'];
      for (const f of typeFields) {
        if (row[f]) { room_type_name = String(row[f]).trim(); break; }
      }
      
      // 入住日期
      const ciFields = ['入住日期', '入住时间', 'check_in', '入住', '到店日期'];
      for (const f of ciFields) {
        if (row[f]) { check_in = String(row[f]).trim(); break; }
      }
      
      // 离店日期
      const coFields = ['离店日期', '离店时间', 'check_out', '离店', '退房日期'];
      for (const f of coFields) {
        if (row[f]) { check_out = String(row[f]).trim(); break; }
      }
      
      // 价格
      const priceFields = ['总价', '总金额', 'price', '订单金额', 'total_price', '底价', '成本价', '入价'];
      for (const f of priceFields) {
        if (row[f]) { total_price = parseFloat(String(row[f]).replace(/[^0-9.]/g, '')) || 0; break; }
      }
      
      // 渠道订单号
      const orderNoFields = ['订单号', '订单ID', 'order_no', '订单编号', '携程订单号', '美团订单号', '抖音订单号'];
      for (const f of orderNoFields) {
        if (row[f]) { channel_order_no = String(row[f]).trim(); break; }
      }
      
      // 格式化日期
      if (check_in && typeof check_in === 'number') {
        const d = new Date((check_in - 25569) * 86400000);
        check_in = d.toISOString().split('T')[0];
      } else if (check_in && !/^\d{4}-\d{2}-\d{2}$/.test(check_in)) {
        const parsed = new Date(check_in);
        if (!isNaN(parsed)) check_in = parsed.toISOString().split('T')[0];
      }
      
      if (check_out && typeof check_out === 'number') {
        const d = new Date((check_out - 25569) * 86400000);
        check_out = d.toISOString().split('T')[0];
      } else if (check_out && !/^\d{4}-\d{2}-\d{2}$/.test(check_out)) {
        const parsed = new Date(check_out);
        if (!isNaN(parsed)) check_out = parsed.toISOString().split('T')[0];
      }
      
      // 计算间夜数
      let nights = 1;
      if (check_in && check_out) {
        const d1 = new Date(check_in), d2 = new Date(check_out);
        nights = Math.max(1, Math.round((d2 - d1) / 86400000));
      }
      
      // 错误检测
      const errors = [];
      if (!guest_name) errors.push('缺少客人姓名');
      if (!check_in) errors.push('缺少入住日期');
      if (!check_out) errors.push('缺少离店日期');
      
      // 按来源设置支付方式
      const payment_method = source === 'ctrip' ? '携程代收' : source === 'meituan' ? '美团代收' : source === 'douyin' ? '抖音代收' : '当面结';

      return {
        row: i + 2, // Excel行号(从2开始,1是表头)
        guest_name, guest_phone, room_no, room_type_name,
        check_in, check_out, nights, total_price,
        channel_id: channelId, channel_name: channelName,
        channel_order_no, payment_method, errors, source
      };
    });
    
    res.json({ preview: parsed, total: parsed.length });
  } catch (e) {
    console.error('Import error:', e);
    res.status(500).json({ error: '解析失败: ' + e.message });
  }
});

// 确认导入
router.post('/confirm', (req, res) => {
  try {
    const { orders } = req.body;
    let imported = 0, skipped = 0, errors = [];
    
    const insert = db.prepare(`
      INSERT INTO orders (guest_name, guest_phone, room_no, room_type_name, check_in, check_out, nights, channel_id, channel_name, channel_order_no, total_price, payment_method, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 1), ?, ?, ?, ?, ?, 'pending', ?)
    `);
    
    for (const o of orders) {
      if (o.errors && o.errors.length > 0) { skipped++; continue; }
      
      // 检查冲突
      const conflict = db.prepare(`
        SELECT id FROM orders WHERE room_no = ? AND status != 'cancelled' AND NOT (check_out <= ? OR check_in >= ?)
      `).get(o.room_no, o.check_in, o.check_out);
      
      if (conflict) {
        errors.push(`第${o.row}行: 房间${o.room_no}在${o.check_in}至${o.check_out}期间已被预订`);
        skipped++;
        continue;
      }
      
      insert.run(o.guest_name, o.guest_phone || '', o.room_no, o.room_type_name || '',
                 o.check_in, o.check_out, o.nights, o.channel_id, o.channel_name,
                 o.channel_order_no || '', o.total_price, o.payment_method || '当面结', req.session.userId);
      imported++;
    }
    
    res.json({ imported, skipped, errors, total: orders.length });
  } catch (e) {
    console.error('Import confirm error:', e);
    res.status(500).json({ error: '导入失败: ' + e.message });
  }
});

// 上传Excel文件
router.post('/upload', (req, res) => {
  try {
    const { file } = req.body; // base64 encoded file
    const buffer = Buffer.from(file, 'base64');
    const data = parseExcel(buffer);
    res.json({ data, rows: data.length });
  } catch (e) {
    res.status(500).json({ error: '读取文件失败: ' + e.message });
  }
});

export default router;
