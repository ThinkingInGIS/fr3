# 双页面系统部署说明

## 构建

```bash
npm ci
npm run build
```

将 `dist/` 作为 Nginx 静态目录。`/mining-brain` 与 `/fr3` 都依赖 SPA fallback。部署前通过 `.env.production` 写入生产地址；Vite 环境变量在构建时固化，修改后需重新构建。

## Nginx

仓库提供 `deploy/nginx.conf.example`，包含 SPA fallback、rosbridge WebSocket 与 MJPEG 代理。生产 HTTPS 页面必须把 WebSocket 代理为 `wss://`，视频服务也必须避免 mixed content。

## ROS 主机

```bash
sudo apt install ros-jazzy-rosbridge-suite
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
ros2 run web_video_server web_video_server
```

不要在前端或 Nginx 配置中保存机器人密码、证书私钥或访问令牌。生产系统应限制 rosbridge 可访问 Topic/Service，并在 ROS 控制节点再次验证所有命令。
