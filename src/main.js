import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import App from './App.vue';
import './style.css';

// 页面组件
import Login from './pages/Login.vue';
import Dashboard from './pages/Dashboard.vue';
import Calendar from './pages/Calendar.vue';
import Orders from './pages/Orders.vue';
import Import from './pages/Import.vue';
import Rooms from './pages/Rooms.vue';
import Settings from './pages/Settings.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: Login },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/calendar', component: Calendar, meta: { requiresAuth: true } },
  { path: '/orders', component: Orders, meta: { requiresAuth: true } },
  { path: '/import', component: Import, meta: { requiresAuth: true } },
  { path: '/rooms', component: Rooms, meta: { requiresAuth: true } },
  { path: '/settings', component: Settings, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const user = JSON.parse(sessionStorage.getItem('pms_user') || 'null');
  if (to.meta.requiresAuth && !user) {
    next('/login');
  } else {
    next();
  }
});

const app = createApp(App);
app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.mount('#app');
