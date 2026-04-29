<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📅 房态日历</h2>
      <div style="display:flex;gap:10px;align-items:center">
        <el-button @click="prevWeek">&lt; 上周</el-button>
        <el-button @click="goToday">今天</el-button>
        <el-button @click="nextWeek">下周 &gt;</el-button>
        <span style="margin-left:10px;color:#606266">{{ weekLabel }}</span>
      </div>
    </div>
    
    <!-- 新建/编辑订单弹窗 -->
    <el-dialog v-model="orderDialogVisible" :title="editingOrder?.id ? '编辑订单' : '新建订单'" width="560px" :close-on-click-modal="false">
      <el-form :model="orderForm" label-width="90px" size="default">
        <el-form-item label="客人姓名" required>
          <el-input v-model="orderForm.guest_name" placeholder="必填" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="orderForm.guest_phone" placeholder="选填" />
        </el-form-item>
        <el-form-item label="房间" required>
          <el-select v-model="orderForm.room_no" placeholder="选择房间" style="width:100%">
            <el-option v-for="r in rooms" :key="r.room_no" :label="r.room_no + ' - ' + r.type_name" :value="r.room_no" />
          </el-select>
        </el-form-item>
        <el-form-item label="入住日期" required>
          <el-date-picker v-model="orderForm.check_in" type="date" value-format="YYYY-MM-DD" placeholder="入住日期" style="width:100%" @change="calcNights" />
        </el-form-item>
        <el-form-item label="离店日期" required>
          <el-date-picker v-model="orderForm.check_out" type="date" value-format="YYYY-MM-DD" placeholder="离店日期" style="width:100%" @change="calcNights" />
        </el-form-item>
        <el-form-item label="入住间夜">
          <el-input-number v-model="orderForm.nights" :min="1" :max="30" style="width:100%" />
        </el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="orderForm.channel_id" placeholder="选择渠道" style="width:100%" @change="onChannelChange">
            <el-option v-for="c in channels" :key="c.id" :label="c.name" :value="c.id">
              <span :style="{display:'inline-block',width:12,height:12,borderRadius:'50%',background:c.color,marginRight:8}"></span>{{ c.name }}
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="渠道订单号">
          <el-input v-model="orderForm.channel_order_no" placeholder="选填，如携程订单号" />
        </el-form-item>
        <el-form-item label="总价(元)">
          <el-input-number v-model="orderForm.total_price" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="付款方式">
          <el-select v-model="orderForm.payment_method" style="width:100%">
            <el-option label="当面结" value="当面结" />
            <el-option label="携程代收" value="携程代收" />
            <el-option label="美团代收" value="美团代收" />
            <el-option label="抖音代收" value="抖音代收" />
            <el-option label="微信支付" value="微信支付" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="转账" value="转账" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="orderForm.notes" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="orderDialogVisible=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveOrder">{{ editingOrder?.id ? '保存修改' : '确认预订' }}</el-button>
      </template>
    </el-dialog>
    
    <!-- 订单详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="订单详情" width="480px">
      <template v-if="selectedOrder">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="客人">{{ selectedOrder.guest_name }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ selectedOrder.guest_phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="房间">{{ selectedOrder.room_no }}</el-descriptions-item>
          <el-descriptions-item label="入住">{{ selectedOrder.check_in }} 至 {{ selectedOrder.check_out }}</el-descriptions-item>
          <el-descriptions-item label="间夜">{{ selectedOrder.nights }}晚</el-descriptions-item>
          <el-descriptions-item label="渠道"><span :style="{color:selectedOrder.channel_color}">{{ selectedOrder.channel_name }}</span></el-descriptions-item>
          <el-descriptions-item label="总价">¥{{ selectedOrder.total_price }}</el-descriptions-item>
          <el-descriptions-item label="付款">{{ selectedOrder.payment_method }}</el-descriptions-item>
          <el-descriptions-item label="渠道单号" :span="2">{{ selectedOrder.channel_order_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ selectedOrder.notes || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="detailDialogVisible=false">关闭</el-button>
        <el-button type="warning" @click="editOrder">编辑</el-button>
        <el-button type="danger" @click="deleteOrder">删除</el-button>
      </template>
    </el-dialog>
    
    <!-- 日历主体 -->
    <el-card shadow="never">
      <!-- 日期表头 -->
      <div class="calendar-date-header">
        <div style="width:100px;flex-shrink:0;padding:6px 8px;font-size:12px;color:#909399">房间</div>
        <div class="date-cell" v-for="d in dateRange" :key="d.date"
             :class="{ today: d.isToday, weekend: d.isWeekend }">
          <div style="font-weight:700">{{ d.day }}</div>
          <div style="font-size:11px">{{ d.weekday }}</div>
        </div>
      </div>
      <!-- 房间行 -->
      <div class="calendar-rooms-container">
        <div v-for="room in calendarRooms" :key="room.room_no" class="calendar-room">
          <div class="room-info">
            <div style="font-weight:600;font-size:14px">{{ room.room_no }}</div>
            <div style="font-size:11px;color:#909399">{{ room.type_name }}</div>
          </div>
          <div class="room-cells">
            <div v-for="d in dateRange" :key="d.date" class="calendar-cell"
                 @click="clickCell(room, d)" :class="{ booked: getCellBooking(room.room_no, d.date) }">
              <template v-if="getCellBooking(room.room_no, d.date)">
                <span class="order-dot" :style="{background: getCellBooking(room.room_no, d.date).channel_color}"></span>
                <span style="font-size:12px">{{ getCellBooking(room.room_no, d.date).guest_name.substring(0,3) }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';

const today = dayjs();
const weekStart = ref(today.startOf('week'));

const rooms = ref([]);
const channels = ref([]);
const calendarOrders = ref([]);

// 日期范围（14天）
const dateRange = computed(() => {
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = weekStart.value.add(i, 'day');
    days.push({
      date: d.format('YYYY-MM-DD'),
      day: d.format('MM/DD'),
      weekday: ['日','一','二','三','四','五','六'][d.day()],
      isToday: d.isSame(today, 'day'),
      isWeekend: d.day() === 0 || d.day() === 6
    });
  }
  return days;
});

const weekLabel = computed(() => weekStart.value.format('MM月DD日') + ' - ' + weekStart.value.add(13, 'day').format('MM月DD日'));

// 合并重叠订单，按日期展示
function getCellBooking(room_no, date) {
  return calendarOrders.value.find(o => 
    o.room_no === room_no && date >= o.check_in && date < o.check_out
  );
}

async function loadData() {
  const start = weekStart.value.format('YYYY-MM-DD');
  const end = weekStart.value.add(13, 'day').format('YYYY-MM-DD');
  
  const [roomsRes, channelsRes, ordersRes] = await Promise.all([
    fetch('/api/rooms'),
    fetch('/api/channels'),
    fetch(`/api/orders/calendar/${start}/${end}`)
  ]);
  
  rooms.value = (await roomsRes.json()).rooms;
  channels.value = (await channelsRes.json()).channels;
  calendarOrders.value = (await ordersRes.json()).orders;
}

// 点击空白单元格
async function clickCell(room, d) {
  const booking = getCellBooking(room.room_no, d.date);
  if (booking) {
    // 已有订单 - 显示详情
    selectedOrder.value = booking;
    detailDialogVisible.value = true;
  } else {
    // 新建订单
    editingOrder.value = null;
    orderForm.value = {
      guest_name: '', guest_phone: '', room_no: room.room_no,
      room_type_name: room.type_name, check_in: d.date, check_out: d.date,
      nights: 1, channel_id: null, channel_name: '自来客',
      channel_order_no: '', total_price: room.base_price || 0,
      payment_method: '当面结', notes: ''
    };
    orderDialogVisible.value = true;
  }
}

const orderDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const selectedOrder = ref(null);
const editingOrder = ref(null);
const saving = ref(false);

const orderForm = ref({
  guest_name: '', guest_phone: '', room_no: '', room_type_name: '',
  check_in: '', check_out: '', nights: 1, channel_id: null, channel_name: '自来客',
  channel_order_no: '', total_price: 0, payment_method: '当面结', notes: ''
});

const calendarRooms = computed(() => {
  return rooms.value.sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.room_no.localeCompare(b.room_no, undefined, { numeric: true });
  });
});

function onChannelChange(id) {
  const c = channels.value.find(c => c.id === id);
  if (c) orderForm.value.channel_name = c.name;
}

function calcNights() {
  if (orderForm.value.check_in && orderForm.value.check_out) {
    const n = dayjs(orderForm.value.check_out).diff(dayjs(orderForm.value.check_in), 'day');
    orderForm.value.nights = Math.max(1, n);
  }
}

async function saveOrder() {
  if (!orderForm.value.guest_name || !orderForm.value.room_no || !orderForm.value.check_in || !orderForm.value.check_out) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  saving.value = true;
  try {
    const url = editingOrder.value ? `/api/orders/${editingOrder.value.id}` : '/api/orders';
    const method = editingOrder.value ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderForm.value)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    ElMessage.success(editingOrder.value ? '修改成功' : '预订成功');
    orderDialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    saving.value = false;
  }
}

function editOrder() {
  detailDialogVisible.value = false;
  editingOrder.value = selectedOrder.value;
  orderForm.value = { ...selectedOrder.value, channel_id: selectedOrder.value.channel_id || null };
  orderDialogVisible.value = true;
}

async function deleteOrder() {
  try {
    await ElMessageBox.confirm('确定删除此订单吗？', '确认删除', { type: 'warning' });
    await fetch(`/api/orders/${selectedOrder.value.id}`, { method: 'DELETE' });
    ElMessage.success('删除成功');
    detailDialogVisible.value = false;
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败');
  }
}

function prevWeek() { weekStart.value = weekStart.value.subtract(7, 'day'); loadData(); }
function nextWeek() { weekStart.value = weekStart.value.add(7, 'day'); loadData(); }
function goToday() { weekStart.value = today.startOf('week'); loadData(); }

onMounted(loadData);
</script>
