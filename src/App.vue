<template>
  <el-config-provider :locale="zhCn">
    <div id="app-root">
      <template v-if="!isLoginPage">
        <el-container style="height: 100vh">
          <el-header height="60">
            <div style="display:flex;align-items:center;flex:1">
              <span class="menu-logo">🏨</span>
              <h1>流光青旅 PMS</h1>
              <span style="margin-left:auto;font-size:14px">{{ user?.nickname || user?.username }}</span>
            </div>
            <el-button text @click="logout" style="color:white;margin-left:16px">退出</el-button>
          </el-header>
          <el-container>
            <el-aside width="200px">
              <el-menu :default-active="$route.path" router style="border:none">
                <el-menu-item index="/dashboard"><span>📊</span> 今日概况</el-menu-item>
                <el-menu-item index="/calendar"><span>📅</span> 房态日历</el-menu-item>
                <el-menu-item index="/orders"><span>📋</span> 订单管理</el-menu-item>
                <el-menu-item index="/import"><span>📥</span> 批量导入</el-menu-item>
                <el-menu-item index="/rooms"><span>🚪</span> 房间管理</el-menu-item>
                <el-menu-item index="/settings"><span>⚙️</span> 系统设置</el-menu-item>
              </el-menu>
            </el-aside>
            <el-main style="background:#f5f7fa;overflow-y:auto">
              <router-view />
            </el-main>
          </el-container>
        </el-container>
      </template>
      <template v-else>
        <router-view />
      </template>
    </div>
  </el-config-provider>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

const route = useRoute();
const router = useRouter();

const user = JSON.parse(sessionStorage.getItem('pms_user') || 'null');
const isLoginPage = computed(() => route.path === '/login');

function logout() {
  sessionStorage.removeItem('pms_user');
  router.push('/login');
}
</script>

<style>
#app-root { height: 100vh; }
.el-header { background: #409eff !important; color: white; }
.el-header h1 { font-size: 18px; font-weight: 600; margin: 0; }
.menu-logo { font-size: 24px; margin-right: 10px; }
.el-aside { background: #fff !important; }
.el-menu-item { font-size: 15px; }
.el-menu-item span { margin-right: 8px; }
</style>
