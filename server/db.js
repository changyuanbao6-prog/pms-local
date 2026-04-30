import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'pms.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initDB() {
  // 用户表（支持多用户）
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      role TEXT DEFAULT 'staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 房型表
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      base_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 房间表（具体床位）
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_no TEXT NOT NULL,
      room_type_id INTEGER,
      floor INTEGER DEFAULT 2,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_type_id) REFERENCES room_types(id)
    )
  `);

  // 渠道表
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#409eff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT NOT NULL,
      guest_phone TEXT DEFAULT '',
      room_id INTEGER,
      room_no TEXT NOT NULL,
      room_type_name TEXT DEFAULT '',
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      nights INTEGER NOT NULL,
      channel_id INTEGER,
      channel_name TEXT DEFAULT '自来客',
      channel_order_no TEXT DEFAULT '',
      total_price REAL DEFAULT 0,
      daily_price REAL DEFAULT 0,
      payment_method TEXT DEFAULT '当面结',
      status TEXT DEFAULT 'confirmed',
      notes TEXT DEFAULT '',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    )
  `);

  // 初始化管理员账号
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)').run('admin', hash, '管理员', 'admin');
    console.log('✓ 默认账号: admin / admin123');
  }

  // 初始化房型
  const typeCount = db.prepare('SELECT COUNT(*) as c FROM room_types').get().c;
  if (typeCount === 0) {
    const types = [
      { name: '男生4人间', base_price: 40 },
      { name: '男生6人间', base_price: 35 },
      { name: '男生2人间', base_price: 55 },
      { name: '女生2人间', base_price: 55 },
      { name: '女生4人间', base_price: 40 },
      { name: '钟点房', base_price: 20 },
    ];
    const insertType = db.prepare('INSERT INTO room_types (name, base_price) VALUES (?, ?)');
    for (const t of types) insertType.run(t.name, t.base_price);
    console.log('✓ 房型初始化完成');
  }

  // 初始化房间
  const roomCount = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
  if (roomCount === 0) {
    const rooms = [
      { no: '201-A', type: 1, floor: 2 }, { no: '201-B', type: 1, floor: 2 },
      { no: '201-C', type: 1, floor: 2 }, { no: '201-D', type: 1, floor: 2 },
      { no: '202-A', type: 2, floor: 2 }, { no: '202-B', type: 2, floor: 2 },
      { no: '202-C', type: 2, floor: 2 }, { no: '202-D', type: 2, floor: 2 },
      { no: '202-E', type: 2, floor: 2 }, { no: '202-F', type: 2, floor: 2 },
      { no: '301-A', type: 4, floor: 3 }, { no: '301-B', type: 4, floor: 3 },
      { no: '302-A', type: 5, floor: 3 }, { no: '302-B', type: 5, floor: 3 },
      { no: '302-C', type: 5, floor: 3 }, { no: '302-D', type: 5, floor: 3 },
      { no: '303-A', type: 5, floor: 3 }, { no: '303-B', type: 5, floor: 3 },
      { no: '303-C', type: 5, floor: 3 }, { no: '303-D', type: 5, floor: 3 },
      { no: '304-A', type: 3, floor: 3 }, { no: '304-B', type: 3, floor: 3 },
      { no: '305-A', type: 1, floor: 3 }, { no: '305-B', type: 1, floor: 3 },
      { no: '305-C', type: 1, floor: 3 }, { no: '305-D', type: 1, floor: 3 },
    ];
    const insertRoom = db.prepare('INSERT INTO rooms (room_no, room_type_id, floor) VALUES (?, ?, ?)');
    for (const r of rooms) insertRoom.run(r.no, r.type, r.floor);
    console.log('✓ 房间初始化完成 (26个床位)');
  }

  // 支付记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      pay_no TEXT UNIQUE NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      trade_no TEXT DEFAULT '',
      qrcode_url TEXT DEFAULT '',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // 更新 orders 表：增加 payment_status 字段（如果不存在）
  try { db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`); } catch(e) { /* 字段已存在 */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN pay_no TEXT DEFAULT ''`); } catch(e) { /* 字段已存在 */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN paid_at DATETIME`); } catch(e) { /* 字段已存在 */ }

  // 初始化渠道
  const channelCount = db.prepare('SELECT COUNT(*) as c FROM channels').get().c;
  if (channelCount === 0) {
    const channels = [
      { name: '自来客', code: 'walkin', color: '#909399' },
      { name: '携程', code: 'ctrip', color: '#c55a11' },
      { name: '美团', code: 'meituan', color: '#f56c6c' },
      { name: '抖音', code: 'douyin', color: '#000000' },
      { name: '飞猪', code: 'fliggy', color: '#e6a23c' },
      { name: '电话预订', code: 'phone', color: '#409eff' },
      { name: '微信', code: 'wechat', color: '#67c23a' },
    ];
    const insertChannel = db.prepare('INSERT INTO channels (name, code, color) VALUES (?, ?, ?)');
    for (const c of channels) insertChannel.run(c.name, c.code, c.color);
    console.log('✓ 渠道初始化完成');
  }
}

export function getDB() { return db; }
