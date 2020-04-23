Delivery Robot Platform 
======================

You can use this code with every other ROS robot.You only need to change topic namespaces in index.html file. 

## Installation
Firstly you must install turtlebot3, rosbridge server and web video server.
```bash
sudo apt-get install "ros-kinetic-turtlebot3*"
sudo apt-get install ros-kinetic-rosbridge-server
sudo apt-get install ros-kinetic-web-video-server
```
then clone this repo
```bash
git clone https://github.com/tehnanmanna/Delivery_Robot_Platform.git
```

## Usage with turtlebot3 simulation

```bash
export TURTLEBOT3_MODEL=waffle
roslaunch turtlebot3_gazebo turtlebot3_world.launch
roslaunch rosbridge_server rosbridge_websocket.launch
roslaunch turtlebot3_navigation turtlebot3_navigation.launch
roslaunch turtlebot3_slam turtlebot3_slam.launch
rosrun web_video_server web_video_server
rosrun robot_pose_publisher robot_pose_publisher
```
then open index.html with your browser and control your robot.








