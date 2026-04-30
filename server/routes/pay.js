import express from 'express';
import alipaySdk from '../alipay.js';

const router = express.Router();

// 创建订单
router.post('/create', async (req, res) => {
  try {
    const { orderId, amount, subject } = req.body;

    if (!orderId || !amount || !subject) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const result = await alipaySdk.exec('alipay.trade.create', {
      bizContent: {
        out_trade_no: String(orderId),
        total_amount: String(amount),
        subject: subject,
        buyer_id: '2088722100887407',
      },
    });

    if (result.code !== '10000') {
      return res.status(500).json({ error: result.subMsg || '创建订单失败' });
    }

    res.json({ tradeNo: result.tradeNo });
  } catch (err) {
    console.error('创建支付订单失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 查询订单状态
router.get('/query/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await alipaySdk.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: orderId,
      },
    });

    if (result.code !== '10000') {
      return res.status(404).json({ error: '订单不存在或查询失败' });
    }

    res.json({
      status: result.tradeStatus,
      tradeNo: result.tradeNo,
      totalAmount: result.totalAmount,
    });
  } catch (err) {
    console.error('查询订单失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 异步回调
router.post('/notify', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const params = req.body;

    const isValid = alipaySdk.checkNotifySign(params);
    if (!isValid) {
      console.error('支付宝回调验签失败');
      return res.send('fail');
    }

    const { trade_status, out_trade_no, trade_no } = params;

    if (trade_status === 'TRADE_SUCCESS') {
      console.log(`✅ 支付成功 - 订单号: ${out_trade_no}, 支付宝流水号: ${trade_no}`);
      // TODO: 更新数据库订单状态
    }

    res.send('success');
  } catch (err) {
    console.error('处理支付回调失败:', err);
    res.send('fail');
  }
});

export default router;