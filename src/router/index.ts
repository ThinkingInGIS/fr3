import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import MiningBrainView from '@/mining/views/MiningBrainView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/mining-brain' },
    { path: '/mining-brain', component: MiningBrainView, meta: { title: '煤矿机器人具身智能作业大脑' } },
    { path: '/fr3', component: DashboardView, meta: { title: 'FR3 具身智能抓取与码放系统' } },
  ],
})

router.afterEach((to) => { document.title = String(to.meta.title ?? '机器人具身智能系统') })
