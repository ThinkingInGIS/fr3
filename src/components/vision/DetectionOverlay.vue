<script setup lang="ts">
import type { DetectedObject } from '@/types/vision'

defineProps<{ objects: DetectedObject[]; selectedId?: string }>()
const colorFor = (object: DetectedObject) => object.id === 'Obj-04' ? '#43d5ad' : object.state === 'occluded' ? '#ee9a57' : '#83a9bd'
</script>

<template>
  <svg class="detection-overlay" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" aria-label="AI 目标识别叠加层">
    <g v-for="object in objects" :key="object.id">
      <template v-if="object.bbox2d">
        <rect :x="object.bbox2d.x" :y="object.bbox2d.y" :width="object.bbox2d.width" :height="object.bbox2d.height" :stroke="colorFor(object)" :class="{ selected: object.id === selectedId }" />
        <path :d="`M${object.bbox2d.x},${object.bbox2d.y + 24} h${Math.min(object.bbox2d.width, 132)} v-24 h-${Math.min(object.bbox2d.width, 132)}z`" :fill="colorFor(object)" />
        <text :x="object.bbox2d.x + 8" :y="object.bbox2d.y + 17">{{ object.id }} · {{ Math.round(object.confidence * 100) }}%</text>
        <g v-if="object.id === selectedId" class="grasp-marker">
          <circle :cx="object.bbox2d.x + object.bbox2d.width / 2" :cy="object.bbox2d.y + object.bbox2d.height / 2" r="12" />
          <path :d="`M${object.bbox2d.x + object.bbox2d.width / 2 - 25},${object.bbox2d.y + object.bbox2d.height / 2}h50 M${object.bbox2d.x + object.bbox2d.width / 2},${object.bbox2d.y + object.bbox2d.height / 2 - 25}v50`" />
        </g>
      </template>
    </g>
  </svg>
</template>
