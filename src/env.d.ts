/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'mock' | 'ros'
  readonly VITE_ROS_VERSION?: '1' | '2'
  readonly VITE_ROSBRIDGE_URL?: string
  readonly VITE_WRIST_VIDEO_URL?: string
  readonly VITE_DEPTH_VIDEO_URL?: string
  readonly VITE_GLOBAL_VIDEO_URL?: string
  readonly VITE_ROBOT_MODEL_URL?: string
  readonly VITE_SERVO_WINDOW_SECONDS?: string
  readonly VITE_STALE_AFTER_MS?: string
  readonly VITE_MOCK_SPEED?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_THEME?: string
  readonly VITE_WRIST_RGB_URL?: string
  readonly VITE_WRIST_DEPTH_URL?: string
  readonly VITE_GLOBAL_CAMERA_URL?: string
  readonly VITE_FR3_URDF_URL?: string
  readonly VITE_COMMAND_CONFIRM?: string
  readonly VITE_STALE_TIMEOUT_MS?: string
  readonly VITE_MAX_LOG_COUNT?: string
}
