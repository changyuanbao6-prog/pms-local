<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📊 今日概况</h2>
      <span style="color:#909399">{{ today }}</span>
    </div>
    
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6"><div class="stat-card"><div class="number" style="color:#67c23a">{{ stats.todayCheckin }}</div><div class="label">今日入住</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="number" style="color:#e6a23c">{{ stats.tomorrowCheckin }}</div><div class="label">明日入住</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="number" style="color:#f56c6c">{{ stats.todayCheckout }}</div><div class="label">今日离店</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="number">{{ stats.inHouse }}/{{ stats.totalRooms }}</div><div class="label">在住/总房 {{ stats.occupancyRate }}%</div></div></el-col>
    </el-row>
    
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6"><div class="stat-card"><div class="number" style="color:#409eff">¥{{ stats.todayRevenue }}</div><div class="label">今日收入</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="number" style="color:#909399">¥{{ stats.monthRevenue }}</div><div class="label">本月收入</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="number">{{ stats.upcomingOrders }}</div><div class="label">待入住订单</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="number">26</div><div class="label">床位总数</div></div></el-col>
    </el-row>
    
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header><div class="card-header"><span>📈 渠道收入统计</span><el-button size="small" @click="loadChannelStats">刷新</el-button></div></template>
          <el-table :data="channelStats" size="small" max-height="260">
            <el-table-column prop="name" label="渠道" width="120">
              <template #default="{ row }">
                <el-tag :color="row.color" style="color:white;border:none">{{ row.name }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_count" label="订单数" width="100" align="center" />
            <el-table-column prop="revenue" label="收入" align="right">
              <template #default="{ row }">¥{{ row.revenue }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="card-header"><span>📋 近期待入住</span><el-button size="small" @click="$router.push('/orders')">查看全部</el-button></div></template>
          <el-table :data="upcomingOrders" size="small" max-height="260">
            <el-table-column prop="check_in" label="入住日期" width="110" />
            <el-table-column prop="guest_name" label="客人" width="100" />
            <el-table-column prop="room_no" label="房间" width="80" align="center" />
            <el-table-column prop="nights" label="间夜" width="60" align="center" />
            <el-table-column label="渠道">
              <template #default="{ row }">
                <span :style="{color: row.channel_color}">{{ row.channel_name }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import dayjs from 'dayjs';

const today = dayjs().format('YYYY年MM月DD日 dddd');
const stats = ref({ todayCheckin: 0, tomorrowCheckin: 0, todayCheckout: 0, inHouse: 0, todayRevenue: 0, monthRevenue: 0, upcomingOrders: 0, totalRooms: 26, occupancyRate: 0 });
const channelStats = ref([]);
const upcomingOrders = ref([]);

async function loadDashboard() {
  const res = await fetch('/api/stats/dashboard');
  const data = await res.json();
  stats.value = data;
}

async function loadChannelStats() {
  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = today.substring(0, 7) + '-01';
  const res = await fetch(`/api/stats/channels?start=${monthStart}&end=${today}`);
  const data = await res.json();
  channelStats.value = data.stats;
}

async function loadUpcoming() {
  const today = dayjs().format('YYYY-MM-DD');
  const res = await fetch(`/api/orders?start=${today}&status=confirmed&pageSize=10`);
  const data = await res.json();
  upcomingOrders.value = data.orders;
}

onMounted(() => { loadDashboard(); loadChannelStats(); loadUpcoming(); });
</script>
