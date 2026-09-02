#!/usr/bin/env python3
"""Publish dashboard TCP status and MoveIt planned TCP path for ROS1 Noetic.

Inputs: /joint_states, TF(base_frame -> tool_frame), move_group/display_planned_path.
Outputs: /robot/status and /embodied_brain/planned_path (both std_msgs/String JSON).
This node is visualization-only; it never commands the robot.
"""

import json
import math
import os
import time

import rospy
import tf2_ros
import yaml
from geometry_msgs.msg import TransformStamped
from moveit_msgs.msg import DisplayTrajectory, RobotState
from moveit_msgs.srv import GetPositionFK, GetPositionFKRequest
from sensor_msgs.msg import JointState
from std_msgs.msg import Header, String


def epoch_ms():
    return int(time.time() * 1000)


TASK_TRAJECTORIES = {
    "rod-01": "zuangan_pick_01.yaml", "rod-1": "zuangan_pick_01.yaml",
    "rod-02": "zuangan_pick_02.yaml", "rod-2": "zuangan_pick_02.yaml",
    "rod-03": "zuangan_pick_03.yaml", "rod-3": "zuangan_pick_03.yaml",
    "resin-01": "maoguji_pick_01.yaml", "resin-1": "maoguji_pick_01.yaml",
    "resin-02": "maoguji_pick_02.yaml", "resin-2": "maoguji_pick_02.yaml",
    "resin-03": "maoguji_pick_03.yaml", "resin-3": "maoguji_pick_03.yaml",
    "bolt-01": "maogan_pick_01.yaml", "bolt-1": "maogan_pick_01.yaml",
    "bolt-02": "maogan_pick_02.yaml", "bolt-2": "maogan_pick_02.yaml",
    "bolt-03": "maogan_pick_03.yaml", "bolt-3": "maogan_pick_03.yaml",
}

class TrajectoryStatusBridge:
    def __init__(self):
        self.base_frame = rospy.get_param("~base_frame", "base_link")
        self.tool_frame = rospy.get_param("~tool_frame", "tool0")
        self.motion_threshold = rospy.get_param("~motion_threshold", 0.001)
        self.path_stride = max(1, int(rospy.get_param("~path_stride", 3)))
        self.trajectory_yaml = rospy.get_param("~trajectory_yaml", "")
        self.trajectory_directory = rospy.get_param("~trajectory_directory", "/home/w/.ros/pose_control_19/trajectories")
        self.yaml_path_stride = max(1, int(rospy.get_param("~yaml_path_stride", 5)))
        self.joints = JointState()
        self.last_position = None
        self.last_position_time = None
        self.last_plan_point_count = 0
        self.last_task_id = ""

        self.status_pub = rospy.Publisher("/robot/status", String, queue_size=3, latch=True)
        self.path_pub = rospy.Publisher("/embodied_brain/planned_path", String, queue_size=1, latch=True)
        self.tf_buffer = tf2_ros.Buffer(cache_time=rospy.Duration(10.0))
        self.tf_listener = tf2_ros.TransformListener(self.tf_buffer)
        self.fk_service = rospy.ServiceProxy("/compute_fk", GetPositionFK)

        joint_topic = rospy.get_param("~joint_states_topic", "/joint_states")
        display_topic = rospy.get_param("~display_trajectory_topic", "/move_group/display_planned_path")
        task_state_topic = rospy.get_param("~task_state_topic", "/embodied_brain/task_state")
        rospy.Subscriber(joint_topic, JointState, self.on_joint_state, queue_size=20)
        rospy.Subscriber(display_topic, DisplayTrajectory, self.on_display_trajectory, queue_size=2)
        rospy.Subscriber(task_state_topic, String, self.on_task_state, queue_size=10)
        if self.trajectory_yaml:
            self.publish_planned_path_from_yaml(self.trajectory_yaml)
        rospy.Timer(rospy.Duration(0.1), self.publish_robot_status)
        rospy.loginfo("dashboard bridge: joints=%s, trajectory=%s, %s -> %s", joint_topic, display_topic, self.base_frame, self.tool_frame)

    @staticmethod
    def publish_json(publisher, payload):
        publisher.publish(String(data=json.dumps(payload, separators=(",", ":"))))

    def on_joint_state(self, message):
        self.joints = message

    def on_task_state(self, message):
        try:
            state = json.loads(message.data)
        except (TypeError, ValueError):
            rospy.logwarn_throttle(5.0, "dashboard bridge: invalid task_state JSON")
            return
        task_id = state.get("currentTaskId")
        if not isinstance(task_id, str) or not task_id or task_id == self.last_task_id:
            return
        self.last_task_id = task_id
        filename = TASK_TRAJECTORIES.get(task_id)
        if not filename:
            rospy.logwarn("dashboard bridge: no YAML trajectory mapped for task %s", task_id)
            return
        yaml_path = os.path.join(self.trajectory_directory, filename)
        if not os.path.isfile(yaml_path):
            alternate_path = os.path.join(self.trajectory_directory, filename.replace("_pick_", "__pick_"))
            if os.path.isfile(alternate_path):
                yaml_path = alternate_path
        self.publish_planned_path_from_yaml(yaml_path)

    def latest_tcp_transform(self):
        return self.tf_buffer.lookup_transform(self.base_frame, self.tool_frame, rospy.Time(0), rospy.Duration(0.05))

    def publish_robot_status(self, _event):
        if not self.joints.name:
            rospy.logwarn_throttle(5.0, "dashboard bridge: waiting for /joint_states")
            return
        try:
            transform = self.latest_tcp_transform()
        except (tf2_ros.LookupException, tf2_ros.ConnectivityException, tf2_ros.ExtrapolationException) as error:
            rospy.logwarn_throttle(5.0, "dashboard bridge: waiting for TF %s -> %s: %s", self.base_frame, self.tool_frame, error)
            return

        now = time.time()
        translation = transform.transform.translation
        rotation = transform.transform.rotation
        position = {"x": translation.x, "y": translation.y, "z": translation.z}
        if self.last_position is None or self.last_position_time is None:
            linear_speed = 0.0
        else:
            dt = max(0.001, now - self.last_position_time)
            linear_speed = math.sqrt(sum((position[key] - self.last_position[key]) ** 2 for key in ("x", "y", "z"))) / dt
        self.last_position, self.last_position_time = position, now
        moving = any(abs(value) > self.motion_threshold for value in self.joints.velocity) or linear_speed > self.motion_threshold

        self.publish_json(self.status_pub, {
            "timestamp": epoch_ms(),
            "controllerState": "EXECUTING" if moving else "IDLE",
            "tcpPosition": position,
            "tcpOrientation": {"x": rotation.x, "y": rotation.y, "z": rotation.z, "w": rotation.w},
            "tcpLinearSpeed": linear_speed,
            "tcpAngularSpeed": 0.0,
            "gripperWidth": 0.0,
            "gripperForce": 0.0,
            "gripperState": "OPEN",
            "plannedProgress": 100.0 if self.last_plan_point_count else 0.0,
            "executedProgress": 0.0,
        })

    def on_display_trajectory(self, message):
        if not message.trajectory:
            return
        try:
            rospy.wait_for_service("/compute_fk", timeout=0.5)
        except rospy.ROSException:
            rospy.logwarn_throttle(5.0, "dashboard bridge: waiting for /compute_fk")
            return

        state_by_joint = dict(zip(message.trajectory_start.joint_state.name, message.trajectory_start.joint_state.position))
        points = []
        for trajectory in message.trajectory:
            joint_trajectory = trajectory.joint_trajectory
            for index, waypoint in enumerate(joint_trajectory.points):
                state_by_joint.update(dict(zip(joint_trajectory.joint_names, waypoint.positions)))
                is_last = index == len(joint_trajectory.points) - 1
                if index % self.path_stride and not is_last:
                    continue
                pose = self.forward_kinematics(state_by_joint)
                if pose is not None:
                    points.append(pose)

        if len(points) < 2:
            rospy.logwarn("dashboard bridge: MoveIt trajectory produced fewer than two TCP points")
            return
        self.last_plan_point_count = len(points)
        self.publish_json(self.path_pub, points)
        rospy.loginfo("dashboard bridge: published %d planned TCP points", len(points))

    def publish_planned_path_from_yaml(self, yaml_path):
        """Publish recorded TCP poses directly; pose_control YAML already uses base_frame coordinates."""
        try:
            with open(yaml_path, "r") as stream:
                trajectory = yaml.safe_load(stream)
        except (OSError, yaml.YAMLError) as error:
            rospy.logerr("dashboard bridge: unable to read trajectory YAML %s: %s", yaml_path, error)
            return
        if not isinstance(trajectory, dict):
            rospy.logerr("dashboard bridge: trajectory YAML root must be a mapping")
            return
        yaml_base_frame = trajectory.get("base_frame")
        if yaml_base_frame and yaml_base_frame != self.base_frame:
            rospy.logwarn("dashboard bridge: YAML base_frame=%s differs from configured base_frame=%s", yaml_base_frame, self.base_frame)
        samples = trajectory.get("samples", [])
        points = []
        for index, sample in enumerate(samples):
            position = sample.get("position") if isinstance(sample, dict) else None
            is_last = index == len(samples) - 1
            if index % self.yaml_path_stride and not is_last:
                continue
            if not isinstance(position, list) or len(position) < 3:
                continue
            try:
                points.append({"x": float(position[0]), "y": float(position[1]), "z": float(position[2])})
            except (TypeError, ValueError):
                continue
        if len(points) < 2:
            rospy.logerr("dashboard bridge: YAML contains fewer than two valid position samples")
            return
        self.last_plan_point_count = len(points)
        self.publish_json(self.path_pub, points)
        rospy.loginfo("dashboard bridge: published %d planned TCP points from %s", len(points), yaml_path)

    def forward_kinematics(self, state_by_joint):
        request = GetPositionFKRequest()
        request.header = Header(frame_id=self.base_frame)
        request.fk_link_names = [self.tool_frame]
        request.robot_state = RobotState()
        request.robot_state.joint_state.name = list(state_by_joint.keys())
        request.robot_state.joint_state.position = list(state_by_joint.values())
        try:
            response = self.fk_service(request)
        except rospy.ServiceException as error:
            rospy.logwarn_throttle(5.0, "dashboard bridge: FK service failed: %s", error)
            return None
        if response.error_code.val != response.error_code.SUCCESS or not response.pose_stamped:
            rospy.logwarn_throttle(5.0, "dashboard bridge: FK returned no pose for %s", self.tool_frame)
            return None
        point = response.pose_stamped[0].pose.position
        return {"x": point.x, "y": point.y, "z": point.z}


if __name__ == "__main__":
    rospy.init_node("dashboard_trajectory_status_bridge")
    TrajectoryStatusBridge()
    rospy.spin()
