import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import channelRoutes from './routes/channels.js';
import statsRoutes from './routes/stats.js';
import importRoutes from './routes/import.js';
import payRouter from './routes/pay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..').replace(/\\/g, '/');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
  secret: 'pms-local-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

initDB();

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/pay', payRouter);

// 健康检查
app.get('/api/health', (req, res) => res.json({ ok: true }));

// 调试路由
app.get('/debug', (req, res) => {
  const indexPath = ROOT + '/dist/index.html';
  res.json({ ROOT, indexPath, exists: existsSync(indexPath) });
});

// SPA 静态文件
app.use(express.static(ROOT + '/dist'));
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(ROOT + '/dist/index.html');
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('===========================================');
  console.log('   流光青旅 PMS 本地系统');
  console.log('===========================================');
  console.log('');
  console.log('   访问地址: http://localhost:' + PORT);
  console.log('');
  console.log('   默认账号: admin');
  console.log('   默认密码: admin123');
  console.log('');
  console.log('   按 Ctrl+C 停止服务');
  console.log('');
});
