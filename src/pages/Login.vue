<template>
  <div class="login-container">
    <div class="login-card">
      <h1>🏨 流光青旅 PMS</h1>
      <p class="subtitle">本地化酒店管理系统</p>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-button type="primary" size="large" style="width:100%;margin-top:10px" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
      </el-form>
      <div style="margin-top:20px;color:#909399;font-size:12px">
        <p>默认账号: <strong>admin</strong> / <strong>admin123</strong></p>
        <p style="margin-top:4px">首次登录后请修改密码</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const form = ref({ username: 'admin', password: '' });
const loading = ref(false);

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  loading.value = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    sessionStorage.setItem('pms_user', JSON.stringify(data.user));
    router.push('/dashboard');
    ElMessage.success('登录成功');
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container { height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%); }
.login-card { background: white; padding: 48px 40px; border-radius: 16px; width: 380px; text-align: center; box-shadow: 0 20px 60px rgba(64,158,255,0.3); }
.login-card h1 { color: #409eff; margin-bottom: 8px; font-size: 26px; }
.subtitle { color: #909399; margin-bottom: 36px; font-size: 14px; }
</style>
