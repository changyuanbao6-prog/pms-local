<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📥 批量导入订单</h2>
    </div>
    
    <!-- 步骤导航 -->
    <el-steps :active="step" finish-status="success" style="margin-bottom:24px">
      <el-step title="选择来源" />
      <el-step title="上传文件" />
      <el-step title="预览确认" />
      <el-step title="完成" />
    </el-steps>
    
    <!-- 步骤1: 选择来源 -->
    <el-card v-if="step === 0" shadow="never">
      <h3 style="margin-bottom:20px">请选择订单来源平台</h3>
      <el-row :gutter="20">
        <el-col :span="6" v-for="s in sources" :key="s.code">
          <div class="source-card" :class="{ active: selectedSource === s.code }" @click="selectedSource = s.code">
            <div style="font-size:40px;margin-bottom:10px">{{ s.icon }}</div>
            <div style="font-size:16px;font-weight:600">{{ s.name }}</div>
            <div style="font-size:12px;color:#909399;margin-top:4px">{{ s.desc }}</div>
          </div>
        </el-col>
      </el-row>
      <div style="margin-top:30px;text-align:center">
        <el-button type="primary" size="large" :disabled="!selectedSource" @click="step = 1">下一步</el-button>
      </div>
    </el-card>
    
    <!-- 步骤2: 上传文件 -->
    <el-card v-if="step === 1" shadow="never">
      <template #header>
        <div class="card-header">
          <span>上传 {{ currentSource?.name }} 订单文件</span>
          <el-button size="small" @click="step = 0">返回</el-button>
        </div>
      </template>
      <el-upload drag :auto-upload="false" :limit="1" accept=".xlsx,.xls,.csv"
        :on-change="handleFileChange" :file-list="fileList">
        <div style="padding:40px">
          <div style="font-size:48px;margin-bottom:16px">📁</div>
          <div style="font-size:16px">将文件拖到此处，或 <em style="color:#409eff">点击上传</em></div>
          <div style="font-size:12px;color:#909399;margin-top:8px">支持 .xlsx .xls .csv 格式</div>
        </div>
      </el-upload>
      <div style="margin-top:16px;background:#fdf6ec;padding:12px 16px;border-radius:8px;font-size:13px;color:#e6a23c">
        💡 提示：从{{ currentSource?.name }}后台导出订单时，请选择包含"宾客姓名/入住日期/离店日期/房号/金额"等字段的完整数据表格。
      </div>
      <div style="margin-top:20px;text-align:center">
        <el-button @click="step = 0">返回</el-button>
        <el-button type="primary" :disabled="!rawData.length" @click="doPreview">解析并预览</el-button>
      </div>
    </el-card>
    
    <!-- 步骤3: 预览确认 -->
    <el-card v-if="step === 2" shadow="never">
      <template #header>
        <div class="card-header">
          <span>预览数据（共 {{ preview.length }} 条）</span>
          <el-button size="small" @click="step = 1">重新上传</el-button>
        </div>
      </template>
      <div style="margin-bottom:12px;color:#909399;font-size:13px">
        绿色：正常 | 红色：数据异常（将被跳过）
      </div>
      <el-table :data="preview" size="small" max-height="400" :row-class-name="getRowClass">
        <el-table-column prop="row" label="行号" width="60" />
        <el-table-column prop="guest_name" label="姓名" width="100" />
        <el-table-column prop="check_in" label="入住" width="105" />
        <el-table-column prop="check_out" label="离店" width="105" />
        <el-table-column prop="nights" label="晚" width="50" align="center" />
        <el-table-column prop="room_no" label="房间" width="80" align="center" />
        <el-table-column prop="total_price" label="总价" width="80" align="right">
          <template #default="{ row }">¥{{ row.total_price }}</template>
        </el-table-column>
        <el-table-column prop="channel_order_no" label="渠道单号" width="130" />
        <el-table-column label="状态">
          <template #default="{ row }">
            <span v-if="row.errors && row.errors.length" style="color:#f56c6c">{{ row.errors.join(',') }}</span>
            <span v-else style="color:#67c23a">✓ 正常</span>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:16px;background:#f0f9eb;padding:12px 16px;border-radius:8px;font-size:13px;color:#67c23a">
        ✓ 共 {{ preview.length }} 条，预计导入 {{ validCount }} 条，跳过 {{ preview.length - validCount }} 条问题数据
      </div>
      <div style="margin-top:20px;text-align:center">
        <el-button @click="step = 1">返回修改</el-button>
        <el-button type="primary" size="large" :loading="importing" @click="doImport">确认导入 {{ validCount }} 条</el-button>
      </div>
    </el-card>
    
    <!-- 步骤4: 完成 -->
    <el-card v-if="step === 3" shadow="never" style="text-align:center;padding:60px">
      <div style="font-size:64px;margin-bottom:20px">{{ importResult.imported > 0 ? '🎉' : '⚠️' }}</div>
      <h2 style="margin-bottom:16px">{{ importResult.imported > 0 ? '导入完成！' : '导入完成（有错误）' }}</h2>
      <p style="color:#909399;margin-bottom:8px">成功导入: {{ importResult.imported }} 条</p>
      <p style="color:#f56c6c;margin-bottom:8px" v-if="importResult.skipped > 0">跳过: {{ importResult.skipped }} 条</p>
      <p style="color:#909399;margin-bottom:24px" v-if="importResult.errors && importResult.errors.length">错误: {{ importResult.errors.length }} 条</p>
      <el-button type="primary" @click="resetImport">继续导入其他文件</el-button>
      <el-button @click="$router.push('/orders')">查看订单</el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';

const sources = [
  { code: 'ctrip', name: '携程', icon: '🏨', desc: '从携程商家后台导出订单' },
  { code: 'meituan', name: '美团', icon: '🍜', desc: '从美团民宿后台导出订单' },
  { code: 'douyin', name: '抖音', icon: '📱', desc: '从抖音来活后台导出订单' },
];

const step = ref(0);
const selectedSource = ref('');
const fileList = ref([]);
const rawData = ref([]);
const preview = ref([]);
const importing = ref(false);
const importResult = ref({});

const currentSource = computed(() => sources.find(s => s.code === selectedSource.value));
const validCount = computed(() => preview.value.filter(p => !p.errors || !p.errors.length).length);

function getRowClass({ row }) {
  return (row.errors && row.errors.length) ? 'error-row' : '';
}

async function handleFileChange(file) {
  fileList.value = [file];
  const buffer = await file.raw.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  rawData.value = xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

async function doPreview() {
  if (!rawData.value.length) { ElMessage.warning('请先上传文件'); return; }
  try {
    const res = await fetch('/api/import/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rawData.value, source: selectedSource.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    preview.value = data.preview;
    step.value = 2;
  } catch (e) {
    ElMessage.error('解析失败: ' + e.message);
  }
}

async function doImport() {
  const toImport = preview.value.filter(p => !p.errors || !p.errors.length);
  importing.value = true;
  try {
    const res = await fetch('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: toImport })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    importResult.value = data;
    step.value = 3;
    if (data.imported > 0) ElMessage.success(`成功导入 ${data.imported} 条订单！`);
    else ElMessage.warning('没有可导入的订单');
  } catch (e) {
    ElMessage.error('导入失败: ' + e.message);
  } finally {
    importing.value = false;
  }
}

function resetImport() {
  step.value = 0;
  selectedSource.value = '';
  fileList.value = [];
  rawData.value = [];
  preview.value = [];
  importResult.value = {};
}
</script>

<style scoped>
.source-card { border: 2px solid #eee; border-radius: 12px; padding: 30px 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
.source-card:hover { border-color: #409eff; box-shadow: 0 4px 12px rgba(64,158,255,0.15); }
.source-card.active { border-color: #409eff; background: #ecf5ff; }
::v-deep .error-row { background: #fef0f0; }
</style>
