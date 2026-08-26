import { defineStore } from 'pinia'
import type { RobotState, TrajectoryPoint } from '@/types/robot'

const initialJoints = () => Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`fr3_joint${i + 1}`, 0]))

export const useRobotStore = defineStore('robot', {
  state: (): RobotState & { trajectory: TrajectoryPoint[] } => ({
    joints: initialJoints(),
    gripperWidth: 0.07,
    available: true,
    motionState: 'IDLE',
    lastUpdate: Date.now(),
    trajectory: [],
  }),
  actions: {
    updateJoints(joints: Record<string, number>) { this.joints = { ...this.joints, ...joints }; this.lastUpdate = Date.now() },
    reset() { this.joints = initialJoints(); this.gripperWidth = 0.07; this.motionState = 'IDLE'; this.trajectory = [] },
  },
})
