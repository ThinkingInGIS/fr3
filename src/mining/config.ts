const env = import.meta.env
const num = (value: string | undefined, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback

export const miningConfig = Object.freeze({
  title: env.VITE_APP_TITLE ?? '煤矿机器人具身智能作业大脑',
  subtitle: '',
  mode: env.VITE_DATA_SOURCE === 'ros' ? 'ros' as const : 'mock' as const,
  rosVersion: env.VITE_ROS_VERSION === '1' ? 1 as const : 2 as const,
  theme: env.VITE_THEME ?? 'coal-blue',
  rosbridgeUrl: env.VITE_ROSBRIDGE_URL ?? 'ws://172.20.161.73:9090',
  wristRgbUrl: env.VITE_WRIST_RGB_URL ?? env.VITE_WRIST_VIDEO_URL ?? '',
  wristDepthUrl: env.VITE_WRIST_DEPTH_URL ?? env.VITE_DEPTH_VIDEO_URL ?? '',
  globalCameraUrl: env.VITE_GLOBAL_CAMERA_URL ?? env.VITE_GLOBAL_VIDEO_URL ?? '',
  fr3UrdfUrl: env.VITE_FR3_URDF_URL ?? env.VITE_ROBOT_MODEL_URL ?? '/models/fr3/fr3.urdf',
  commandConfirm: env.VITE_COMMAND_CONFIRM !== 'false',
  staleTimeoutMs: num(env.VITE_STALE_TIMEOUT_MS, 3000),
  maxLogCount: num(env.VITE_MAX_LOG_COUNT, 500),
})

export const miningTopics = Object.freeze({
  joints: env.VITE_TOPIC_JOINT_STATES ?? '/joint_states',
  workflow: env.VITE_TOPIC_WORKFLOW_STATE ?? '/embodied_brain/workflow_state',
  taskPlan: env.VITE_TOPIC_TASK_PLAN ?? '/embodied_brain/task_plan',
  taskState: env.VITE_TOPIC_MINING_TASK_STATE ?? '/embodied_brain/task_state',
  robotStatus: env.VITE_TOPIC_ROBOT_STATUS ?? '/robot/status',
  plannedPath: env.VITE_TOPIC_PLANNED_PATH ?? '/embodied_brain/planned_path',
  detections: env.VITE_TOPIC_DETECTED_OBJECTS ?? '/detected_objects',
  devices: env.VITE_TOPIC_DEVICE_STATUS ?? '/system/device_status',
  events: env.VITE_TOPIC_EXECUTION_EVENTS ?? '/embodied_brain/events',
  command: env.VITE_TOPIC_MINING_COMMAND ?? '/embodied_brain/command',
  actionTrigger: env.VITE_TOPIC_ACTION_TRIGGER ?? '/embodied_brain/action_trigger',
  safetyViolation: env.VITE_TOPIC_SAFETY_VIOLATION ?? '/person_detector_realsense_d455/safety_violation',
  safetyStop: env.VITE_TOPIC_SAFETY_STOP ?? '/person_detector_realsense_d455/stop',
})

export const miningMessageTypes = Object.freeze(miningConfig.rosVersion === 1 ? {
  string: 'std_msgs/String',
  bool: 'std_msgs/Bool',
  jointState: 'sensor_msgs/JointState',
} : {
  string: 'std_msgs/msg/String',
  bool: 'std_msgs/msg/Bool',
  jointState: 'sensor_msgs/msg/JointState',
})
