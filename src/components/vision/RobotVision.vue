<script setup lang="ts">
import { computed } from 'vue'
import { Camera, Layers3, Maximize2, ScanLine, Video } from 'lucide-vue-next'
import { runtimeConfig } from '@/config/runtime'
import { useVisionStore } from '@/stores/vision'
import { useWorldModelStore } from '@/stores/worldModel'
import DetectionOverlay from './DetectionOverlay.vue'

const vision = useVisionStore(), world = useWorldModelStore()
const tabs = ['AI 识别', 'RGB', '深度', '点云', '全局相机']
const liveVideo = computed(() => runtimeConfig.dataSource === 'ros' && runtimeConfig.wristVideoUrl)
</script>

<template>
  <section class="panel vision-panel">
    <div class="panel-head">
      <div><span class="eyebrow">ROBOT VISION</span><h2>机器人视觉</h2></div>
      <div class="live-pill"><span class="status-dot online" />D435i · LIVE</div>
    </div>
    <div class="vision-tabs">
      <button v-for="tab in tabs" :key="tab" :class="{ active: vision.activeView === tab, disabled: ['点云','全局相机'].includes(tab) }" @click="vision.activeView = tab">
        <ScanLine v-if="tab === 'AI 识别'" :size="13" /><Camera v-else-if="tab === 'RGB'" :size="13" /><Layers3 v-else :size="13" />{{ tab }}
      </button>
    </div>
    <div class="vision-frame">
      <div class="vision-media">
        <img v-if="liveVideo" :src="runtimeConfig.wristVideoUrl" alt="D435i 手腕相机实时视频" />
        <div v-else class="mock-camera-scene">
          <div class="camera-grid" /><div class="workbench-edge" />
          <span v-for="object in vision.detections" :key="object.id" :class="['mock-object', object.id, object.className.includes('圆柱') && 'cylinder']" />
          <div class="gripper-shadow"><i /><i /></div>
        </div>
        <DetectionOverlay v-if="vision.activeView === 'AI 识别'" :objects="vision.detections" :selected-id="world.selectedObjectId" />
      </div>
      <div class="frame-meta"><Video :size="12" />1280 × 720 <span>30 FPS</span><span>{{ liveVideo ? 'MJPEG' : 'SYNTHETIC' }}</span></div>
      <button class="maximize" title="全屏视觉"><Maximize2 :size="14" /></button>
    </div>
    <div class="vision-footer">
      <span><i class="legend-box selected" />当前目标</span><span><i class="legend-box" />可抓取</span><span><i class="legend-box occluded" />遮挡</span>
      <strong>{{ vision.detections.length }} OBJECTS DETECTED</strong>
    </div>
  </section>
</template>
