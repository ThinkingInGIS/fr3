export interface Vec3 { x: number; y: number; z: number }
export interface Quaternion { x: number; y: number; z: number; w: number }
export interface Pose { frameId: string; position: Vec3; orientation: Quaternion }

export interface RobotState {
  joints: Record<string, number>
  gripperWidth: number
  available: boolean
  motionState: 'IDLE' | 'MOVING' | 'PAUSED' | 'ERROR'
  lastUpdate: number
}

export interface TrajectoryPoint { x: number; y: number; z: number }
