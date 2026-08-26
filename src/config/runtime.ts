const env = import.meta.env

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const runtimeConfig = Object.freeze({
  dataSource: env.VITE_DATA_SOURCE === 'ros' ? 'ros' as const : 'mock' as const,
  rosbridgeUrl: env.VITE_ROSBRIDGE_URL ?? 'ws://127.0.0.1:9090',
  wristVideoUrl: env.VITE_WRIST_VIDEO_URL ?? '',
  depthVideoUrl: env.VITE_DEPTH_VIDEO_URL ?? '',
  globalVideoUrl: env.VITE_GLOBAL_VIDEO_URL ?? '',
  robotModelUrl: env.VITE_ROBOT_MODEL_URL ?? '/models/fr3/fr3.urdf',
  servoWindowSeconds: numberFromEnv(env.VITE_SERVO_WINDOW_SECONDS, 10),
  staleAfterMs: numberFromEnv(env.VITE_STALE_AFTER_MS, 3000),
  mockSpeed: numberFromEnv(env.VITE_MOCK_SPEED, 1),
  topics: {
    jointStates: env.VITE_TOPIC_JOINT_STATES ?? '/joint_states',
    detectedObjects: env.VITE_TOPIC_DETECTED_OBJECTS ?? '/detected_objects',
    worldModel: env.VITE_TOPIC_WORLD_MODEL ?? '/world_model',
    taskState: env.VITE_TOPIC_TASK_STATE ?? '/task_state',
    taskEvents: env.VITE_TOPIC_TASK_EVENTS ?? '/task_events',
    servoError: env.VITE_TOPIC_SERVO_ERROR ?? '/visual_servo/error',
    graspTarget: env.VITE_TOPIC_GRASP_TARGET ?? '/grasp_target',
    trajectory: env.VITE_TOPIC_TRAJECTORY ?? '/display_planned_path',
    command: env.VITE_COMMAND_TOPIC ?? '/fr3_dashboard/command',
  },
})

export type RuntimeConfig = typeof runtimeConfig
