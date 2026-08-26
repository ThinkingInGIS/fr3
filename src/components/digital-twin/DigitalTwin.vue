<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Box, Camera, Cloud, Crosshair, Route } from 'lucide-vue-next'
import { useRobotStore } from '@/stores/robot'
import { useWorldModelStore } from '@/stores/worldModel'
import { SceneManager } from '@/three/sceneManager'

const canvasHost = ref<HTMLElement>()
const robot = useRobotStore(), world = useWorldModelStore()
let manager: SceneManager | undefined
const selected = computed(() => world.objects.find((item) => item.id === world.selectedObjectId))

onMounted(() => {
  if (!canvasHost.value) return
  manager = new SceneManager(canvasHost.value)
  manager.updateRobot(robot.joints, robot.gripperWidth)
  manager.updateObjects(world.objects, world.selectedObjectId)
})

watch(() => [robot.joints, robot.gripperWidth] as const, ([joints, width]) => manager?.updateRobot(joints, width), { deep: true })
watch(() => [world.objects, world.selectedObjectId] as const, ([objects, id]) => manager?.updateObjects(objects, id), { deep: true })
watch(() => robot.trajectory, (value) => manager?.updateTrajectory(value), { deep: true })
onBeforeUnmount(() => manager?.dispose())
</script>

<template>
  <section class="panel twin-panel">
    <div class="panel-head floating-head">
      <div><span class="eyebrow">DIGITAL TWIN</span><h2>FR3 实时作业空间</h2></div>
      <div class="live-pill"><span class="status-dot online" />LIVE · 30 FPS</div>
    </div>
    <div ref="canvasHost" class="twin-canvas" />
    <div class="view-chips">
      <span><Box :size="13" /> 目标模型</span><span><Route :size="13" /> 规划轨迹</span>
      <span><Camera :size="13" /> 相机视锥</span><span class="muted"><Cloud :size="13" /> 点云待接入</span>
    </div>
    <div class="twin-hud">
      <div><Crosshair :size="15" /><span>当前目标</span><strong>{{ selected?.id ?? '—' }}</strong></div>
      <div><span>FRAME</span><strong>world</strong></div>
      <div><span>EE POSE</span><strong>0.391, −0.102, 0.132 m</strong></div>
    </div>
    <div class="axis-label"><i class="axis-x" />X <i class="axis-y" />Y <i class="axis-z" />Z</div>
  </section>
</template>
