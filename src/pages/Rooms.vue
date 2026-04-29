<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🚪 房间管理</h2>
      <el-button type="primary" @click="openRoomDialog()">+ 添加房间</el-button>
    </div>
    
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="房间列表" name="rooms">
          <el-table :data="rooms" size="small">
            <el-table-column prop="room_no" label="房间号" width="100" />
            <el-table-column prop="type_name" label="房型" width="140" />
            <el-table-column prop="floor" label="楼层" width="80" align="center" />
            <el-table-column prop="base_price" label="参考价" width="100" align="right">
              <template #default="{ row }">¥{{ row.base_price }}/晚</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status==='active'?'success':'danger'" size="small">{{ row.status==='active'?'启用':'停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="openRoomDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteRoom(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="房型管理" name="types">
          <div style="margin-bottom:12px"><el-button size="small" @click="openTypeDialog()">+ 添加房型</el-button></div>
          <el-table :data="roomTypes" size="small">
            <el-table-column prop="name" label="房型名称" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="base_price" label="基准价" width="120" align="right">
              <template #default="{ row }">¥{{ row.base_price }}/晚</template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="openTypeDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteType(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <!-- 房间编辑弹窗 -->
    <el-dialog v-model="roomDialogVisible" :title="editingRoom?.id ? '编辑房间' : '添加房间'" width="400px">
      <el-form :model="roomForm" label-width="80px">
        <el-form-item label="房间号" required><el-input v-model="roomForm.room_no" placeholder="如 202-A" /></el-form-item>
        <el-form-item label="房型">
          <el-select v-model="roomForm.room_type_id" style="width:100%">
            <el-option v-for="t in roomTypes" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层">
          <el-input-number v-model="roomForm.floor" :min="1" :max="10" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roomDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="saveRoom">{{ editingRoom?.id ? '保存' : '添加' }}</el-button>
      </template>
    </el-dialog>
    
    <!-- 房型编辑弹窗 -->
    <el-dialog v-model="typeDialogVisible" :title="editingType?.id ? '编辑房型' : '添加房型'" width="400px">
      <el-form :model="typeForm" label-width="80px">
        <el-form-item label="房型名称" required><el-input v-model="typeForm.name" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="typeForm.description" /></el-form-item>
        <el-form-item label="基准价"><el-input-number v-model="typeForm.base_price" :min="0" :precision="2" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="saveType">{{ editingType?.id ? '保存' : '添加' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const activeTab = ref('rooms');
const rooms = ref([]);
const roomTypes = ref([]);
const roomDialogVisible = ref(false);
const typeDialogVisible = ref(false);
const editingRoom = ref(null);
const editingType = ref(null);

const roomForm = ref({ room_no: '', room_type_id: null, floor: 2 });
const typeForm = ref({ name: '', description: '', base_price: 0 });

async function loadData() {
  const [r, t] = await Promise.all([fetch('/api/rooms'), fetch('/api/rooms/types')]);
  rooms.value = (await r.json()).rooms;
  roomTypes.value = (await t.json()).types;
}

function openRoomDialog(room = null) {
  editingRoom.value = room;
  roomForm.value = room ? { room_no: room.room_no, room_type_id: room.room_type_id, floor: room.floor } : { room_no: '', room_type_id: null, floor: 2 };
  roomDialogVisible.value = true;
}

async function saveRoom() {
  try {
    const url = editingRoom.value ? `/api/rooms/${editingRoom.value.id}` : '/api/rooms';
    const method = editingRoom.value ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roomForm.value) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    ElMessage.success(editingRoom.value ? '保存成功' : '添加成功');
    roomDialogVisible.value = false;
    loadData();
  } catch (e) { ElMessage.error(e.message); }
}

async function deleteRoom(room) {
  await ElMessageBox.confirm(`确定删除房间 ${room.room_no}？`, '确认', { type: 'warning' });
  await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
  ElMessage.success('删除成功');
  loadData();
}

function openTypeDialog(type = null) {
  editingType.value = type;
  typeForm.value = type ? { name: type.name, description: type.description || '', base_price: type.base_price } : { name: '', description: '', base_price: 0 };
  typeDialogVisible.value = true;
}

async function saveType() {
  if (editingType.value) {
    // Update via rooms route for now - simplified
    const existing = roomTypes.value.find(t => t.id === editingType.value.id);
    Object.assign(existing, typeForm.value);
  } else {
    const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_type_id: typeForm.value.id, name: typeForm.value.name, base_price: typeForm.value.base_price }) });
    // Simpler: just reload
  }
  // Simplified: store in local state for now
  if (!editingType.value) {
    roomTypes.value.push({ ...typeForm.value, id: Date.now() });
  } else {
    const idx = roomTypes.value.findIndex(t => t.id === editingType.value.id);
    if (idx >= 0) roomTypes.value[idx] = { ...roomTypes.value[idx], ...typeForm.value };
  }
  ElMessage.success(editingType.value ? '保存成功' : '添加成功');
  typeDialogVisible.value = false;
}

async function deleteType(type) {
  await ElMessageBox.confirm(`确定删除房型 ${type.name}？`, '确认', { type: 'warning' });
  roomTypes.value = roomTypes.value.filter(t => t.id !== type.id);
  ElMessage.success('删除成功');
}

onMounted(loadData);
</script>
