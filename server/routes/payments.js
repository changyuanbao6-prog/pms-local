import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// =============================================
// 模拟微信支付配置（未来替换为真实商户号）
// =============================================
const MOCK_CONFIG = {
  enabled: true,
  // 正式接入微信支付时，只需修改以下配置：
  // mchId: 'YOUR_MCH_ID',
  // apiKey: 'YOUR_API_KEY',
  // appId: 'YOUR_APP_ID',
};

// =============================================
// 统一支付订单号前缀
// =============================================
function genPayNo(orderId) {
  return `PMS${Date.now()}${String(orderId).padStart(6, '0')}`;
}

// =============================================
// GET /api/payments/types
// 获取支持的支付方式列表
// =============================================
router.get('/types', (req, res) => {
  res.json({
    types: [
      { code: 'wechat_scan', name: '微信扫码支付', icon: 'wechat', enabled: MOCK_CONFIG.enabled },
      { code: 'wechat_h5', name: '微信H5支付', icon: 'wechat', enabled: MOCK_CONFIG.enabled },
      { code: 'alipay_scan', name: '支付宝扫码', icon: 'alipay', enabled: MOCK_CONFIG.enabled },
      { code: 'cash', name: '现金支付', icon: 'cash', enabled: true },
      { code: 'transfer', name: '转账支付', icon: 'bank', enabled: true },
    ]
  });
});

// =============================================
// GET /api/payments/qrcode/:orderId
// 为指定订单生成支付二维码（模拟）
// =============================================
router.get('/qrcode/:orderId', (req, res) => {
  const { orderId } = req.params;
  const { amount, method } = req.query;

  if (!amount) return res.status(400).json({ error: '缺少金额参数' });
  if (!MOCK_CONFIG.enabled) return res.status(503).json({ error: '支付功能已关闭' });

  const payNo = genPayNo(orderId);

  // 模拟微信/支付宝统一下单
  // 真实场景：调用微信支付统一下单接口 / alipay.trade.precreate
  const mockPayload = {
    pay_no: payNo,
    order_id: parseInt(orderId),
    amount: parseFloat(amount),
    method: method || 'wechat_scan',
    status: 'pending',
    qrcode_data: buildMockQRData(payNo, parseFloat(amount), method || 'wechat_scan'),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15分钟有效期
  };

  res.json({ ok: true, payment: mockPayload });
});

// =============================================
// POST /api/payments/poll/:payNo
// 轮询支付状态（模拟轮询微信支付查询接口）
// =============================================
router.post('/poll/:payNo', (req, res) => {
  const { payNo } = req.params;

  // 真实场景：调用微信支付订单查询接口
  // 为方便测试，我们用请求体中传入的模拟状态
  const { mockStatus } = req.body;

  // 支持手动模拟回调：
  // mockStatus: 'success' → 支付成功
  // mockStatus: 'closed'  → 支付关闭
  // 不传 → 随机返回（用于演示轮询）
  let status = 'pending';
  let tradeNo = '';

  if (mockStatus === 'success') {
    status = 'success';
    tradeNo = `WX${Date.now()}`;
  } else if (mockStatus === 'closed') {
    status = 'closed';
  }
  // 默认pending（轮询演示）

  res.json({ pay_no: payNo, status, trade_no: tradeNo });
});

// =============================================
// POST /api/payments/callback/:payNo
// 模拟支付回调（供前端测试按钮触发）
// =============================================
router.post('/callback/:payNo', (req, res) => {
  const { payNo } = req.params;

  // 模拟微信支付回调
  // 真实场景：微信支付服务器主动POST到商户回调地址
  res.json({
    ok: true,
    message: '模拟回调成功，真实环境由微信支付服务器回调',
    pay_no: payNo,
    status: 'success',
    trade_no: `WX${Date.now()}`,
    paid_at: new Date().toISOString(),
  });
});

// =============================================
// GET /api/payments/history
// 支付记录列表
// =============================================
router.get('/history', (req, res) => {
  const { page = 1, pageSize = 50, status } = req.query;

  // 支付记录存储在 orders 表的 payment_log JSON 字段
  // 这里我们改用独立的 payments 表查询
  let where = [];
  let params = [];

  if (status) { where.push('status = ?'); params.push(status); }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM payments ${whereSQL}`).get(...params)?.c || 0;
  const payments = db.prepare(`
    SELECT p.*, o.guest_name, o.room_no, o.check_in, o.check_out
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    ${whereSQL}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

  res.json({ payments, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// =============================================
// 辅助函数：构建模拟二维码内容
// =============================================
function buildMockQRData(payNo, amount, method) {
  const base = `https://api.mch.weixin.qq.com/pay/goods?out_trade_no=${payNo}`;
  const params = new URLSearchParams({
    total_amount: amount.toFixed(2),
    method,
    mock: 'true',
  });
  return `${base}&${params.toString()}`;
}

export default router;