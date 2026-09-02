# 机器人具身智能 Web 展示系统

Vue 3 + TypeScript 大屏项目，包含两个独立页面：

- `/mining-brain`：煤矿机器人具身智能作业大脑（默认入口）。
- `/fr3`：FR3 具身智能抓取与码放系统（保留的原页面）。

煤矿页面完成了“指令交互 → 意图理解 → 作业规划 → 任务执行 → 作业完成”的 Mock 闭环，以及 ROS 2 接口骨架。真实设备状态必须由 ROS 回传，页面刷新不会自动发送作业指令。

## 环境、安装和启动

- Node.js 20.19+ 或 22.12+
- npm 10+

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

打开 `http://localhost:5173/mining-brain`。生产检查：

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

## Mock 模式

保持 `VITE_DATA_SOURCE=mock`。煤矿页面不会自动启动；输入“开始钻锚作业”后生成 3 个父任务、9 个子任务，依次完成钻杆、锚固剂和锚杆的检测、抓取与上料。支持暂停、继续、取消、重置、速度和模拟故障。详见 [Mock 演示](docs/mock-demo.md)。

## ROS 模式

```dotenv
VITE_DATA_SOURCE=ros
VITE_ROSBRIDGE_URL=ws://192.168.1.20:9090
VITE_WRIST_RGB_URL=http://192.168.1.20:8080/stream?topic=/camera/camera/color/image_raw
VITE_GLOBAL_CAMERA_URL=http://192.168.1.20:8080/stream?topic=/global_camera/image_raw
```

ROS 2 Jazzy 示例：

```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
ros2 run web_video_server web_video_server
```

Topic、URL 和模型路径集中在 `.env`、`src/mining/config.ts`；JSON 校验与订阅骨架位于 `src/mining/dataSource.ts`。详见 [ROS 接口](docs/ros-interfaces.md)。

## FR3 URDF 和 mesh

把 URDF 和 mesh 放入 `public/models/fr3/`，确保 URDF 内 mesh URI 可由浏览器同源访问：

```dotenv
VITE_FR3_URDF_URL=/models/fr3/fr3.urdf
```

当前两个页面均使用可回退的简化 FR3 模型。真实 URDF、TF 与 MoveIt 对齐属于下一接入阶段，不应视为已经验证。

## 部署

`npm run build` 生成 `dist/`。Nginx 示例为 `deploy/nginx.conf.example`，包含 SPA 路由、rosbridge WebSocket 和视频代理。详见 [部署说明](docs/deployment.md)。

## 常见故障

- ROS 离线：检查 rosbridge、防火墙、WebSocket URL；HTTPS 页面需使用 `wss://`。
- 视频黑屏：视频不走 rosbridge，检查 MJPEG URL、CORS、Topic 和 mixed content。
- JSON 消息被忽略：浏览器控制台会显示 Zod 字段校验原因。
- 画面显示 `STALE`：最近遥测超过 `VITE_STALE_TIMEOUT_MS`。
- URDF 未加载：当前版本会显示简化模型；检查静态资源路径后再接入加载器。

## 当前边界

已完成阶段 1、阶段 2 的演示能力和阶段 3 接口骨架。未完成真机 URDF/TF、MoveIt `DisplayTrajectory` 解析、真实 WebRTC、ROS Action 权限控制和硬件安全急停。Web“取消”只表示任务取消请求。
http://172.20.161.219:5174/

----------------------------------------------------------------------------------------------------------------------------
-------------------------------前端页面适配的3个 ros 服务----------------------------------------------------------------------
# 0. 新建terminal启动ros bridge

source rc.d/ros-teleop2.env
roslaunch rosbridge_server rosbridge_websocket.launch   address:=0.0.0.0   port:=9090


# 1.新建terminal启动摄像头图像server

source rc.d/ros-teleop2.env
rosrun web_video_server web_video_server _port:=8081 _address:=0.0.0.0  _server_threads:=4

# 2. 新建terminal启动坐标系转换工具
chmod 755 /home/w/embodied_ws/src/embodied_brain_bridge/scripts/ros1_trajectory_status_bridge.py
sed -i 's/\r$//' /home/w/embodied_ws/src/embodied_brain_bridge/scripts/ros1_trajectory_status_bridge.py

source rc.d/ros-teleop2.env
##source /opt/ros/noetic/setup.bash
source /home/w/embodied_ws/devel/setup.bash

rosrun embodied_brain_bridge ros1_trajectory_status_bridge.py \
  _base_frame:=base_link \
  _tool_frame:=tool0 \
  _trajectory_directory:=/home/w/.ros/pose_control_19/trajectories \
  _yaml_path_stride:=5

---------------------------------------------------------------------------------

# 0.启动d405 
source rc.d/ros-teleop2.env
roslaunch realsense2_camera rs_camera.launch   camera:=camera405   tf_prefix:=camera405   serial_no:=260522273009   device_type:=d405   enable_color:=true   enable_depth:=true   enable_infra:=false   enable_confidence:=false   enable_gyro:=false   enable_accel:=false   align_depth:=false   depth_width:=640   depth_height:=480


----------------------------------------------------------------------------------------------------------------------------

## 2.启动ur机械臂关节角 topic：joint/states
打开192.168.1.105(w)

source rc.d/ros-teleop2.env

cd ws_touch/

source devel/setup.bash

roslaunch pose_control_19 ur_touch_haptic_teleop_pose.launch

-----------------------------------------------------------------------------

### 轨迹录制节点 新建终端
source rc.d/ros-teleop2.env
cd ws_touch/
source devel/setup.bash
roslaunch pose_control_19 teach_trajectory_replay.launch \
  speed_scale:=1.0 \
  enforce_replay_speed_limits:=false \
  approach_linear_speed:=0.2 \
  approach_angular_speed:=1.5

### 开始录制服务 新建终端
source rc.d/ros-teleop2.env
cd ws_touch/
source devel/setup.bash
rosservice call /teach_trajectory_replay/set_record_file "{file_path: 'demo_pick_01'}"
rosservice call /teach_trajectory_replay/start_recording "{}"
rosservice call /teach_trajectory_replay/stop_recording "{}"

### 夹爪 新建终端
source rc.d/ros-teleop2.env
cd ws_touch/
source devel/setup.bash
rosrun robotiq_2f_gripper_control Robotiq2FGripperSimpleController.py


### 播放录制文件
rosservice call /teach_trajectory_replay/set_replay_file  "{file_path: 'demo_pick_01'}"

rosservice call /teach_trajectory_replay/play "{}" 



## 启动机械臂监听
source rc.d/ros-teleop2.env
cd ws_touch/
source devel/setup.bash
roslaunch pose_control_19 teach_trajectory_sequence.launch


在机械臂运动轨迹规划窗口，当前的设计是规划路径和执行路径用虚线和实线进行表达，请将这个功能加入进来，且实施路径是随着机械臂的运动动态刷新的

## 启动轨迹规划桥点
source /opt/ros/noetic/setup.bash
source /home/w/embodied_ws/devel/setup.bash

rosrun embodied_brain_bridge ros1_trajectory_status_bridge.py \
  _base_frame:=base_link \
  _tool_frame:=tool0 \
  _trajectory_directory:=/home/w/.ros/pose_control_19/trajectories \
  _yaml_path_stride:=5




做以下修改：1.加粗作业规划窗口的规划路线虚线和执行路线的实线；2.同时规划路径不要一次性加载完成，仅加载当前执行点后一段位置的规划路径，这样看起来是动态规划的；3.同时不显示已经执行路径前的虚线
