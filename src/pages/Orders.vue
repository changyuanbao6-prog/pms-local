<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📋 订单管理</h2>
      <el-button type="primary" @click="openNew">+ 新建订单</el-button>
    </div>
    
    <!-- 筛选 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <el-form inline size="small">
        <el-form-item label="入住日期"><el-date-picker v-model="filter.start" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width:140px" /></el-form-item>
        <el-form-item label="至"><el-date-picker v-model="filter.end" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width:140px" /></el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="filter.channel_id" placeholder="全部" clearable style="width:120px">
            <el-option v-for="c in channels" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="房间"><el-input v-model="filter.room_no" placeholder="房间号" style="width:100px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filter.status" placeholder="全部" clearable style="width:110px">
            <el-option label="已确认" value="confirmed" />
            <el-option label="已离店" value="checked_out" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="loadOrders">查询</el-button><el-button @click="resetFilter">重置</el-button></el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="never">
      <el-table :data="orders" v-loading="loading" size="small" max-height="calc(100vh - 360px)">
        <el-table-column prop="check_in" label="入住" width="105" sortable />
        <el-table-column prop="check_out" label="离店" width="105" sortable />
        <el-table-column prop="nights" label="晚数" width="60" align="center" />
        <el-table-column prop="guest_name" label="客人" width="100" />
        <el-table-column prop="guest_phone" label="电话" width="130" />
        <el-table-column prop="room_no" label="房间" width="80" align="center" />
        <el-table-column prop="total_price" label="总价" width="90" align="right">
          <template #default="{ row }">¥{{ row.total_price }}</template>
        </el-table-column>
        <el-table-column label="渠道" width="100">
          <template #default="{ row }">
            <el-tag :color="row.channel_color" size="small" style="color:white;border:none">{{ row.channel_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payment_method" label="付款" width="100" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status==='confirmed'" type="success" size="small">已确认</el-tag>
            <el-tag v-else-if="row.status==='checked_out'" size="small">已离店</el-tag>
            <el-tag v-else type="info" size="small">已取消</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewOrder(row)">查看</el-button>
            <el-button size="small" type="primary" @click="editOrder(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
        layout="total, prev, pager, next" style="margin-top:12px" @current-change="loadOrders" />
    </el-card>
    
    <!-- 新建/编辑弹窗（同Calendar类似，简略版） -->
    <el-dialog v-model="dialogVisible" :title="editing?.id ? '编辑订单' : '新建订单'" width="520px" :close-on-click-modal="false">
      <el-form :model="form" label-width="90px" size="default">
        <el-form-item label="客人姓名" required><el-input v-model="form.guest_name" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.guest_phone" /></el-form-item>
        <el-form-item label="房间" required>
          <el-select v-model="form.room_no" placeholder="选择房间" style="width:100%">
            <el-option v-for="r in rooms" :key="r.room_no" :label="r.room_no + ' - ' + r.type_name" :value="r.room_no" />
          </el-select>
        </el-form-item>
        <el-form-item label="入住日期" required><el-date-picker v-model="form.check_in" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="calcNights" /></el-form-item>
        <el-form-item label="离店日期" required><el-date-picker v-model="form.check_out" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="calcNights" /></el-form-item>
        <el-form-item label="间夜"><el-input-number v-model="form.nights" :min="1" :max="30" style="width:100%" /></el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="form.channel_id" style="width:100%" @change="onChannelChange">
            <el-option v-for="c in channels" :key="c.id" :label="c.name" :value="c.id"><span :style="{display:'inline-block',width:10,height:10,borderRadius:'50%',background:c.color,marginRight:6}"></span>{{ c.name }}</el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="渠道订单号"><el-input v-model="form.channel_order_no" /></el-form-item>
        <el-form-item label="总价"><el-input-number v-model="form.total_price" :min="0" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="付款方式">
          <el-select v-model="form.payment_method" style="width:100%">
            <el-option v-for="m in ['当面结','携程代收','美团代收','抖音代收','微信支付','支付宝','转账']" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="已确认" value="confirmed" />
            <el-option label="已离店" value="checked_out" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.notes" type="textarea" :rows="2" /></el-form-item>
        <el-form-item v-if="form.payment_method === '支付宝'" label="支付宝付款">
        <el-button type="primary" :loading="payLoading" @click="handleAlipay">立即发起支付</el-button>
        <span v-if="alipayTradeNo" style="margin-left:10px;color:green">✅ 已发起，交易号：{{ alipayTradeNo }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitOrder">{{ editing?.id ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
async function handleAlipay() {
  if (!form.value.total_price || form.value.total_price <= 0) {
    ElMessage.warning('请先填写订单总价');
    return;
  }
  payLoading.value = true;
  try {
    const orderId = 'ORDER_' + Date.now();
    const res = await fetch('/api/pay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: String(form.value.total_price),
        subject: `${form.value.guest_name} - ${form.value.room_no}号房`,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alipayTradeNo.value = data.tradeNo;
    ElMessage.success('支付宝订单创建成功，交易号：' + data.tradeNo);
  } catch (e) {
    ElMessage.error('发起支付失败：' + e.message);
  } finally {
    payLoading.value = false;
  }
}
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';

const orders = ref([]);
const rooms = ref([]);
const channels = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const editing = ref(null);
const saving = ref(false);
const payLoading = ref(false);
const alipayTradeNo = ref('');
const page = ref(1);
const pageSize = ref(50);
const total = ref(0);

const filter = ref({ start: dayjs().startOf('month').format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD'), channel_id: null, room_no: '', status: '' });

const form = ref({ guest_name: '', guest_phone: '', room_no: '', room_type_name: '', check_in: '', check_out: '', nights: 1, channel_id: null, channel_name: '自来客', channel_order_no: '', total_price: 0, payment_method: '当面结', status: 'confirmed', notes: '' });

async function loadOrders() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: page.value, pageSize: pageSize.value,
      ...(filter.value.start && { start: filter.value.start }),
      ...(filter.value.end && { end: filter.value.end }),
      ...(filter.value.channel_id && { channel_id: filter.value.channel_id }),
      ...(filter.value.room_no && { room_no: filter.value.room_no }),
      ...(filter.value.status && { status: filter.value.status }),
    });
    const res = await fetch(`/api/orders?${params}`);
    const data = await res.json();
    orders.value = data.orders;
    total.value = data.total;
  } finally { loading.value = false; }
}

async function loadRoomsChannels() {
  const [r, c] = await Promise.all([fetch('/api/rooms'), fetch('/api/channels')]);
  rooms.value = (await r.json()).rooms;
  channels.value = (await c.json()).channels;
}

function resetFilter() { filter.value = { start: '', end: '', channel_id: null, room_no: '', status: '' }; loadOrders(); }
function onChannelChange(id) { const c = channels.value.find(c => c.id === id); if (c) form.value.channel_name = c.name; }
function calcNights() { if (form.value.check_in && form.value.check_out) { const n = dayjs(form.value.check_out).diff(dayjs(form.value.check_in), 'day'); form.value.nights = Math.max(1, n); } }

function openNew() { editing.value = null; form.value = { guest_name:'',guest_phone:'',room_no:'',room_type_name:'',check_in:'',check_out:'',nights:1,channel_id:null,channel_name:'自来客',channel_order_no:'',total_price:0,payment_method:'当面结',status:'confirmed',notes:'' }; dialogVisible.value = true; }
function viewOrder(row) { editing.value = row; Object.assign(form.value, row, { channel_id: row.channel_id || null }); dialogVisible.value = true; }
function editOrder(row) { viewOrder(row); }

async function submitOrder() {
  if (!form.value.guest_name || !form.value.room_no || !form.value.check_in || !form.value.check_out) { ElMessage.warning('请填写完整信息'); return; }
  saving.value = true;
  try {
    const url = editing.value?.id ? `/api/orders/${editing.value.id}` : '/api/orders';
    const method = editing.value?.id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form.value) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    ElMessage.success(editing.value?.id ? '修改成功' : '创建成功');
    dialogVisible.value = false;
    loadOrders();
  } catch (e) { ElMessage.error(e.message); } finally { saving.value = false; }
}

onMounted(() => { loadOrders(); loadRoomsChannels(); });
</script>
