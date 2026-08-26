<script setup lang="ts">
import { computed } from 'vue'
import { Box, CircleCheck, EyeOff, MapPinned, RouteOff } from 'lucide-vue-next'
import { useWorldModelStore } from '@/stores/worldModel'

const world = useWorldModelStore()
const graspable = computed(() => world.objects.filter((item) => ['graspable', 'selected'].includes(item.state)).length)
const stateText = { graspable: '可抓取', selected: '当前目标', occluded: '遮挡', unreachable: '不可达', grasped: '已抓取', placed: '已放置' }
</script>

<template>
  <section class="panel world-panel">
    <div class="panel-head compact"><div><span class="eyebrow">WORLD MODEL</span><h2>场景理解</h2></div><span class="sync-time">已同步</span></div>
    <div class="world-summary">
      <div><Box :size="15" /><span>目标</span><strong>{{ world.objects.length }}</strong></div><div><CircleCheck :size="15" /><span>可达</span><strong>{{ graspable }}</strong></div><div><MapPinned :size="15" /><span>空槽位</span><strong>{{ world.slots.filter(s => !s.occupied).length }}</strong></div>
    </div>
    <div class="object-list">
      <div v-for="object in world.objects" :key="object.id" :class="['object-row', object.state]">
        <span class="object-swatch" :class="object.id" />
        <div><strong>{{ object.id }}</strong><small>{{ object.className }}</small></div>
        <span class="confidence">{{ Math.round(object.confidence * 100) }}%</span>
        <span class="object-state"><EyeOff v-if="object.state === 'occluded'" :size="11" /><RouteOff v-if="object.state === 'unreachable'" :size="11" />{{ stateText[object.state] }}</span>
      </div>
    </div>
    <div class="slots-block"><span>码放槽位</span><div class="slot-grid"><i v-for="slot in world.slots" :key="slot.id" :class="{ occupied: slot.occupied, next: slot.id === world.nextSlotId }" :title="slot.id">{{ slot.id.slice(-2) }}</i></div></div>
  </section>
</template>
