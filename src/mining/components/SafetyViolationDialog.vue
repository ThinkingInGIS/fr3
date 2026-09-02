<script setup lang="ts">
import { ref } from 'vue'
import { Hand, Play, TriangleAlert } from 'lucide-vue-next'
import { getMiningDataSource } from '../dataSource'

const source = getMiningDataSource()
const busy = ref(false)
const error = ref('')

const decide = async (stop: boolean) => {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await source.respondToSafetyViolation(stop) }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '安全控制指令发送失败' }
  finally { busy.value = false }
}
</script>

<template>
  <section class="safety-violation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="safety-violation-title">
    <div class="safety-violation-card">
      <TriangleAlert :size="56" aria-hidden="true" />
      <p> </p>
      <h2 id="safety-violation-title">检测到人员进入危险区域</h2>
      <strong>机械臂作业已进入安全处置流程</strong>
      <div class="safety-choices">
        <button class="safety-choice remote" :disabled="busy" @click="decide(true)"><Hand :size="34" /><span>遥操</span></button>
        <button class="safety-choice resume" :disabled="busy" @click="decide(false)"><Play :size="34" fill="currentColor" /><span>继续</span></button>
      </div>
      <small v-if="busy">正在发送安全控制指令…</small>
      <small v-else-if="error" class="error">{{ error }}</small>
      <small v-else>请选择后续处置方式</small>
    </div>
  </section>
</template>
