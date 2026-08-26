import { defineStore } from 'pinia'
import type { WorldModel } from '@/types/worldModel'

const initialSlots = () => Array.from({ length: 6 }, (_, i) => ({
  id: `Slot-${String(i + 1).padStart(2, '0')}`,
  occupied: false,
  position: { x: 0.52 + (i % 3) * 0.09, y: -0.2 + Math.floor(i / 3) * 0.09, z: 0.04 },
}))

export const useWorldModelStore = defineStore('worldModel', {
  state: (): WorldModel => ({ objects: [], slots: initialSlots(), updatedAt: Date.now() }),
  actions: {
    reset() { this.objects = []; this.slots = initialSlots(); this.selectedObjectId = undefined; this.nextSlotId = undefined; this.updatedAt = Date.now() },
  },
})
