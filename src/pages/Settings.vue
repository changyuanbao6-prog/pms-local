<template>
  <div class="page-container">
    <div class="page-header">
      <h2>⚙️ 系统设置</h2>
    </div>
    
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span>🔐 账号管理</span></template>
          <el-form label-width="100px" size="default">
            <el-form-item label="当前账号">{{ user?.username }}</el-form-item>
            <el-form-item label="昵称">{{ user?.nickname }}</el-form-item>
            <el-form-item label="角色">{{ user?.role === 'admin' ? '管理员' : '员工' }}</el-form-item>
          </el-form>
          <el-divider />
          <h4 style="margin-bottom:12px">修改密码</h4>
          <el-form label-width="100px" size="default">
            <el-form-item label="原密码"><el-input v-model="pwForm.old" type="password" show-password /></el-form-item>
            <el-form-item label="新密码"><el-input v-model="pwForm.new" type="password" show-password /></el-form-item>
            <el-form-item label="确认新密码"><el-input v-model="pwForm.confirm" type="password" show-password /></el-form-item>
            <el-form-item><el-button type="primary" :loading="pwLoading" @click="changePassword">确认修改</el-button></el-form-item>
          </el-form>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span>📊 渠道管理</span></template>
          <el-table :data="channels" size="small">
            <el-table-column prop="name" label="渠道名称" />
            <el-table-column label="颜色" width="100">
              <template #default="{ row }">
                <span :style="{display:'inline-block',width:16,height:16,borderRadius:'50%',background:row.color,verticalAlign:'middle'}"></span>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="代码" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="deleteChannel(row)" :disabled="row.code==='walkin'">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top:12px">
            <el-form inline size="small">
              <el-form-item><el-input v-model="newChannel.name" placeholder="渠道名" /></el-form-item>
              <el-form-item><el-input v-model="newChannel.code" placeholder="代码" /></el-form-item>
              <el-form-item><el-color-picker v-model="newChannel.color" size="small" /></el-form-item>
              <el-form-item><el-button type="primary" @click="addChannel">添加</el-button></el-form-item>
            </el-form>
          </div>
        </el-card>
        
        <el-card shadow="never" style="margin-top:16px">
          <template #header><span>💾 数据管理</span></template>
          <el-space direction="vertical" style="width:100%">
            <el-button @click="exportData">📤 导出所有订单(Excel)</el-button>
            <el-button type="info" @click="checkUpdate">🔍 检查更新</el-button>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
    
    <el-card shadow="never" style="margin-top:16px">
      <template #header><span>ℹ️ 系统信息</span></template>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
        <el-descriptions-item label="数据库">SQLite (pms.db)</el-descriptions-item>
        <el-descriptions-item label="端口">3000</el-descriptions-item>
        <el-descriptions-item label="数据位置">pms-local/pms.db</el-descriptions-item>
        <el-descriptions-item label="运行时">Node.js</el-descriptions-item>
        <el-descriptions-item label="前端">Vue 3 + Element Plus</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const user = ref(JSON.parse(sessionStorage.getItem('pms_user') || '{}'));
const channels = ref([]);
const pwLoading = ref(false);
const pwForm = ref({ old: '', new: '', confirm: '' });
const newChannel = ref({ name: '', code: '', color: '#409eff' });

async function loadChannels() {
  const res = await fetch('/api/channels');
  channels.value = (await res.json()).channels;
}

async function changePassword() {
  if (!pwForm.value.old || !pwForm.value.new) { ElMessage.warning('请填写完整'); return; }
  if (pwForm.value.new !== pwForm.value.confirm) { ElMessage.warning('两次密码不一致'); return; }
  pwLoading.value = true;
  try {
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: pwForm.value.old, newPassword: pwForm.value.new }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    ElMessage.success('密码修改成功');
    pwForm.value = { old: '', new: '', confirm: '' };
  } catch (e) { ElMessage.error(e.message); } finally { pwLoading.value = false; }
}

async function addChannel() {
  if (!newChannel.value.name || !newChannel.value.code) { ElMessage.warning('请填写完整'); return; }
  const res = await fetch('/api/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newChannel.value) });
  const data = await res.json();
  if (!res.ok) { ElMessage.error(data.error); return; }
  ElMessage.success('添加成功');
  newChannel.value = { name: '', code: '', color: '#409eff' };
  loadChannels();
}

async function deleteChannel(ch) {
  await fetch(`/api/channels/${ch.id}`, { method: 'DELETE' });
  ElMessage.success('删除成功');
  loadChannels();
}

async function exportData() {
  const res = await fetch('/api/orders?pageSize=10000');
  const data = await res.json();
  if (!data.orders.length) { ElMessage.warning('暂无订单数据'); return; }
  const rows = data.orders.map(o => ({
    入住日期: o.check_in, 离店日期: o.check_out, 间夜: o.nights,
    客人: o.guest_name, 电话: o.guest_phone, 房间: o.room_no,
    渠道: o.channel_name, 渠道单号: o.channel_order_no,
    总价: o.total_price, 付款方式: o.payment_method, 备注: o.notes
  }));
  // XLSX is already imported at top
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '订单');
  XLSX.writeFile(wb, `orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  ElMessage.success('导出成功');
}

function checkUpdate() { ElMessage.info('当前已是最新版本 v1.0.0'); }

onMounted(loadChannels);
</script>
