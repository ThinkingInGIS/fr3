<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Box, Eye, EyeOff, Focus, Play, Rotate3D } from 'lucide-vue-next'
import { MiningSceneManager, type MiningView, type PickPlaceState, type RobotModelState } from '../MiningSceneManager'
import { useMiningStore } from '../store'

const store = useMiningStore(), host = ref<HTMLElement>(), showPath = ref(true), showEnvironment = ref(true), modelState = ref<RobotModelState>('loading'), previewState = ref<PickPlaceState>('idle')
let scene: MiningSceneManager | undefined
onMounted(() => { if(host.value){scene=new MiningSceneManager(host.value,state=>modelState.value=state,state=>previewState.value=state);scene.updateRobot(store.robot);scene.updatePaths(store.plannedPath,store.executedPath)} })
watch(()=>store.robot,(value)=>scene?.updateRobot(value),{deep:true})
watch(()=>[store.plannedPath,store.executedPath] as const,([planned,executed])=>scene?.updatePaths(planned,executed),{deep:true})
onBeforeUnmount(()=>scene?.dispose())
const view=(value:MiningView)=>scene?.setView(value)
const togglePath=()=>{showPath.value=!showPath.value;scene?.setPathVisible(showPath.value)}
const toggleEnvironment=()=>{showEnvironment.value=!showEnvironment.value;scene?.setEnvironmentVisible(showEnvironment.value)}
const previewLabel=computed(()=>({idle:'路径预演',approach:'接近目标',grasp:'夹取中',transfer:'搬运中',place:'码放中',complete:'再次预演'}[previewState.value]))
const previewActive=computed(()=>!['idle','complete'].includes(previewState.value))
</script>

<template>
  <section class="mine-panel twin-card">
    <div class="mine-panel-head overlay-head"><div><h2>作业规划</h2></div><div class="head-state"><i :class="{mock:modelState==='error'}" />{{ modelState==='ready'?'URDF 已加载':modelState==='error'?'简化模型':'URDF 加载中' }}</div></div>
    <div ref="host" class="mine-twin-host" />
    <div class="twin-toolbar">
      <button title="自由视角" @click="view('default')"><Rotate3D :size="13" />自由</button><button @click="view('top')">俯视</button><button @click="view('front')">正视</button><button @click="view('side')">侧视</button>
      <button :class="{off:!showPath}" @click="togglePath"><Eye v-if="showPath" :size="12" /><EyeOff v-else :size="12" />路径</button>
      <button :class="{off:!showEnvironment}" @click="toggleEnvironment"><Box :size="12" />环境</button><button class="preview-btn" :class="{running:previewActive}" @click="scene?.preview()"><Play :size="12" />{{ previewLabel }}</button>
    </div>
    <div class="twin-caption"><span><i class="path planned" />规划路径</span><span><i class="path executed" />执行路径</span><strong><Focus :size="13" />{{ store.workflow.currentObjectId ?? '等待目标' }}</strong></div>
  </section>
</template>
