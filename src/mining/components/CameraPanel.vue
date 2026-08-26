<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera, Expand, Layers3, Radio, ScanLine } from 'lucide-vue-next'
import { miningConfig } from '../config'
import { useMiningStore } from '../store'
import MiningDetectionOverlay from './MiningDetectionOverlay.vue'

const props=defineProps<{source:'WRIST'|'GLOBAL';title:string}>(),store=useMiningStore(),view=ref<'AI'|'RGB'|'DEPTH'>('AI')
const items=computed(()=>store.detections.filter(item=>item.source===props.source))
const url=computed(()=>{
  if(props.source==='GLOBAL') return miningConfig.globalCameraUrl
  return view.value==='DEPTH'?miningConfig.wristDepthUrl:miningConfig.wristRgbUrl
})
const live=computed(()=>store.mode==='ros'&&Boolean(url.value))
const streamType=computed(()=>view.value==='DEPTH'?'DEPTH':'RGB')
</script>

<template>
  <section :class="['mine-panel','camera-card',source.toLowerCase()]">
    <div class="mine-panel-head"><div><h2>{{ title }}</h2></div><div class="head-state"><i :class="{mock:!live}" />{{ live?'MJPEG LIVE':'MOCK' }}</div></div>
    <div class="camera-tabs"><button :class="{active:view==='AI'}" @click="view='AI'"><ScanLine :size="11" />AI 叠加</button><button :class="{active:view==='RGB'}" @click="view='RGB'"><Camera :size="11" />RGB</button><button v-if="source==='WRIST'" :class="{active:view==='DEPTH'}" @click="view='DEPTH'"><Layers3 :size="11" />深度</button></div>
    <div class="camera-viewport">
      <img v-if="live" :key="url" :src="url" :alt="`${title} ${streamType}`" />
      <div v-else :class="['mine-camera-mock',source.toLowerCase()]"><div class="mine-grid" /><template v-if="source==='GLOBAL'"><i class="material rod" /><i class="material resin" /><i class="material bolt" /><i class="safety-zone" /><span class="mine-wall">巷道钻锚作业区 · CAM-02</span></template><template v-else><i class="wrist-gripper left" /><i class="wrist-gripper right" /><i class="close-target" /></template></div>
      <MiningDetectionOverlay v-if="view==='AI'" :detections="items" />
      <div class="camera-meta"><Radio :size="10" />D405 {{ streamType }} <span>MJPEG LIVE</span><span>{{ items.length }} TARGETS</span></div><button class="camera-expand" title="全屏查看"><Expand :size="13" /></button>
    </div>
  </section>
</template>
