<script setup lang="ts">
import type { Detection } from '../types'
defineProps<{detections:Detection[]}>()
</script>
<template>
  <svg class="mining-detection-overlay" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet">
    <g v-for="item in detections" :key="item.id"><rect :class="{selected:item.selected}" :x="item.bbox.x" :y="item.bbox.y" :width="item.bbox.width" :height="item.bbox.height" /><path :d="`M${item.bbox.x},${item.bbox.y+27}h${Math.min(180,item.bbox.width)}v-27H${item.bbox.x}z`" /><text :x="item.bbox.x+8" :y="item.bbox.y+19">{{ item.className }} · {{ Math.round(item.confidence*100) }}%</text><g v-if="item.selected" class="mining-grasp"><circle :cx="item.bbox.x+item.bbox.width/2" :cy="item.bbox.y+item.bbox.height/2" r="14" /><path :d="`M${item.bbox.x+item.bbox.width/2-28},${item.bbox.y+item.bbox.height/2}h56M${item.bbox.x+item.bbox.width/2},${item.bbox.y+item.bbox.height/2-28}v56`" /></g></g>
  </svg>
</template>
