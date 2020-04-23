<?php

$dbhost="localhost"; //replace with your hostname

$dbuser = "root"; //replace with your admin username

$dbpass = ""; //password of your admin

$dbname = "robot_navigation";

$con = mysqli_connect($dbhost, $dbuser, $dbpass);

if($con){

$db = mysqli_select_db($con,$dbname);
if(!$db){
echo "Could not connect to database ".mysqli_error($con);
}

    //echo '<h1 style="color:red;">MySQL Server is connected :( </h1>';

}

else{
//echo '<h1 style="color:red;">MySQL Server is not connected :( </h1>';
    
//echo "could not connect to server";

}

?>

<!doctype html>
<html lang="en">
<!HEAD START>

    <head>
        <meta charset="utf-8">

        <!CSS style URL>
            <link rel="stylesheet" href="style.css">

            <!Js sources URL's START>
                <script type="text/javascript" src="./rosjsScripts/eventemitter2.min.js"></script>
                <script type="text/javascript" src="./rosjsScripts/roslib.min.js"></script>
                <script type="text/javascript" src="./rosjsScripts/easeljs.min.js"></script>
                <script type="text/javascript" src="./rosjsScripts/ros2d.min.js"></script>
                <script type="text/javascript" src="./rosjsScripts/mjpegcanvas.min.js"></script>
                <script type="text/javascript" src="./rosjsScripts/nav2d.js"></script>
                <!Js sources URL's END>

                    <!Main script start>
                        <script type="text/javascript" type="text/javascript">
                            // This function connects to the rosbridge server running on the local computer on port 9090
                            var rbServer = new ROSLIB.Ros({
                                url: 'ws://localhost:9090'
                            });

                            // This function is called upon the rosbridge connection event
                            rbServer.on('connection', function() {
                                // Write appropriate message to #feedback div when successfully connected to rosbridge
                                var fbDiv = document.getElementById('feedback');
                                fbDiv.innerHTML = "<p>Connected to Robot Operation System Server</p>";
                            });

                            // This function is called when there is an error attempting to connect to rosbridge
                            rbServer.on('error', function(error) {
                                // Write appropriate message to #feedback div upon error when attempting to connect to rosbridge
                                var fbDiv = document.getElementById('feedback');
                                fbDiv.innerHTML = "<p>Error connecting to websocket server</p>";
                            });

                            // This function is called when the connection to rosbridge is closed
                            rbServer.on('close', function() {
                                // Write appropriate message to #feedback div upon closing connection to rosbridge
                                var fbDiv = document.getElementById('feedback');
                                fbDiv.innerHTML = "<p>Connection to websocket server closed</p>";
                            });

                            /*
                            Upper section of code necessary for ros bridge web server
                            Lower section for elements in the page 
                            */

                            //Navigation and Map linses START-------------------
                            var nav_viewer = 0;
                            var nav_client = 0;

                            function nav_and_map_init() {
                                //Create nav2d canvas.
                                nav_viewer = new ROS2D.Viewer({
                                    divID: 'nav2dmap',
                                    width: 500,
                                    height: 500
				    
                                });

                                // Setup the nav client.
                                nav_client = NAV2D.OccupancyGridClientNav({
                                    ros: rbServer,
                                    continuous: true,
                                    rootObject: nav_viewer.scene,
                                    viewer: nav_viewer,
                                    serverName: '/move_base',
                                    withOrientation: true
                                });

                             

                            }

                            function MapZoomFunc() {
                                nav_viewer.scene.scaleX *= 1.25;
                                nav_viewer.scene.scaleY *= 1.25;
                            }

                            function MapPanFunc() {
                                nav_viewer.scene.scaleX *= 0.75;
                                nav_viewer.scene.scaleY *= 0.75;
                            }

                            function cancelGoalFunc() {
                                nav_client.navigator.cancelGoal();
                            }
                            //Navigation and Map linses END------------------------

                            // Create mp4 main viewer.
                            function cam_init() {
                                var cam_viewer = new MJPEGCANVAS.Viewer({
                                    divID: 'mjpeg',
                                    host: 'localhost',
                                    width: 500,
                                    height: 500,
                                    topic: '/camera/rgb/image_raw'
                                });
                            }

                            //This lines subscribe to odom
                            var odomTopic = new ROSLIB.Topic({
                                ros: rbServer,
                                name: '/odom',
                                messageType: 'nav_msgs/Odometry'
                            });
                            //This lines pull data from subscribed topic odom
                            odomTopic.subscribe(function(message) {
                               // var poseX = document.getElementById('poseX');
                               // poseX.innerHTML = "X = " + message.pose.pose.position.x
                               // var poseY = document.getElementById('poseY');
                               // poseY.innerHTML = "Y = " + message.pose.pose.position.y
                               // var poseTheta = document.getElementById('poseTheta');
                               // poseTheta.innerHTML = "Theta = " + message.pose.pose.orientation.w
                               //var poseLinVel = document.getElementById('poseLinVel');
                               //poseLinVel.innerHTML = "LinVel = " + message.twist.twist.linear.x
                               //var poseAngVel = document.getElementById('poseAngVel');
                               // poseAngVel.innerHTML = "AngVel = " + message.twist.twist.angular.z
                            });

                            //This lines subscribe to moveBase/Status
                            var moveBaseStatusTopic = new ROSLIB.Topic({
                                ros: rbServer,
                                name: '/move_base/status',
                                messageType: 'actionlib_msgs/GoalStatusArray'
                            });
				var movebaseStatus;
				var goalflag;
                            //This lines pull data from subscribed topic moveBase/Status
                            moveBaseStatusTopic.subscribe(function(message) {
                                //movebaseStatus = document.getElementById('goalx');
                                //movebaseStatus.innerHTML = "Status: " + message.status_list[0].text
				//goalflag = true;

				//while(goalflag)
				//{
				//  if(movebaseStatus == "Status: Goal reached.")
				//   {	
					//setTimeout(function(){ chnagestatus(); }, 10000);	
			        //   }
				//}

                            });

			  

                            // These lines create a topic object for publish twist message
                            var cmdVelTopic = new ROSLIB.Topic({
                                ros: rbServer,
                                name: '/cmd_vel',
                                messageType: 'geometry_msgs/Twist'
                            });

                            // These lines create a message to identify the twist message.Identifying the msg is required for publishing.
                            // It initalizes all properties to zero. They will be set to appropriate values before we publish this message.
                            var twist = new ROSLIB.Message({
                                linear: {
                                    x: 0.0,
                                    y: 0.0,
                                    z: 0.0
                                },
                                angular: {
                                    x: 0.0,
                                    y: 0.0,
                                    z: 0.0
                                }
                            });

                            //This functions are basic cmd_vel_control blocks
                            function sleep(delay) {
                                var start = new Date().getTime();
                                while (new Date().getTime() < start + delay);
                            }

                            function moveSomeWhere(linVel, angVel) {
                                twist.linear.x = linVel;
                                twist.angular.z = angVel;

                                cmdVelTopic.publish(twist);
                            }

                            function goforward() {
                                moveSomeWhere(0.5, 0)
                                sleep(100)
                                moveSomeWhere(0, 0)
                            }

                            function gobackward() {
                                moveSomeWhere(-0.5, 0)
                                sleep(100)
                                moveSomeWhere(0, 0)
                            }

                            function turnright() {
                                moveSomeWhere(0, -0.5)
                                sleep(100)
                                moveSomeWhere(0, 0)
                            }

                            function turnleft() {
                                moveSomeWhere(0, 0.5)
                                sleep(100)
                                moveSomeWhere(0, 0)
                            }

                        </script>
                        <!Main script end>
    </head>
    <!HEAD END>
        <!BODY START>

            <body style="overflow: hidden;" onload="cam_init(); nav_and_map_init();">

                <div style="padding-left: 200px;">
                    <!--
        <div class="OpenMessage">
            <b>Ankara University TurtleBot Version 2.1 Command Control Center</b>
        </div>
        <div class="AnkUniLogo">
            <img src="img/AnkUniLogo.png" alt="logo" />
        </div>
        <div class="YazgitLogo">
            <img src="img/YazgitLogo.png" alt="logo" />
        </div>
        <div class="ROSLogo">
            <img src="img/ROSLogo.png" alt="logo" />
        </div>
-->
                    <br /><br /><br />


                    <div style="left: 595;" class="Nav2dmapText" id = "goalx">2D Map and Control Window</div>
                    <div class="CamText">RGB Camera</div>
                    <div class="nav2dmapCanvas" id="nav2dmap"></div>
                    <div class="camCanvas" id="mjpeg"></div>
                    <form style="position: absolute;" id="c1111">
                        <div class="MapButtonsForm">
                            <button class="MapZoomButton" type="button"="Up" onclick="MapZoomFunc()">Zoom In</button>
                            <button class="MapPanButton"
type="button"="Up" onclick="MapPanFunc()">Zoom Out</button>
                            <button class="CancelGoalButton" type="button"="Up" onclick="cancelGoalFunc()">Cancel</button>
                        </div>
                        <img style="    width: 250px; height: 320px;  position: relative; top: 250px;" src="robot.png" alt="roubot">
                    </form>
                    <form id="c2356">
                        <div class="MoveButtonsForm">
                            <button class="UpButton" type="button"="Up" onclick="goforward()">Up</button>
                            <button class="DownButton" type="button"="Up" onclick="gobackward()">Down</button>
                            <button class="LeftButton" type="button"="Up" onclick="turnleft()">Left</button>
                            <button class="RightButton" type="button"="Up" onclick="turnright()">Right</button>
                        </div>
                    </form>


                    <img style="width: 626px; height: 80px; position: relative; top: 0px; left: 198px;" src="logo-white.png" alt="roubot">
                    <div style="top: 80px; position: relative;  left: 165px;    display: inline-grid;">
                        <p style="color: white;    display: contents;    font-size: 25px;    margin-bottom: 20px;    padding-left: 20px;">-- Collect from -- </p>
                        <select id="TargetLocations" name="target" style="    width: 166px; height: 35px; margin-left: 5px; border-radius: 11px;">
                            <?php 
                                $sql = mysqli_query($con,"SELECT * FROM locations");
                                while ($row = mysqli_fetch_array($sql))
                            {
                                echo "<option value=".$row['x_coordinate'].",".$row['y_coordinate'].">" . $row['Name'] . "</option>";
            
                            }
                                ?>
                        </select>
                        <p style="color: white;    display: contents;    font-size: 25px;    margin-bottom: 20px;    padding-left: 20px;">-- Deliver To -- </p>
                        <select id="DeliverLocation" name="target" style="    width: 166px; height: 35px; margin-left: 5px; border-radius: 11px;">
                        <?php 
                                $sql = mysqli_query($con,"SELECT * FROM locations");
                                while ($row = mysqli_fetch_array($sql))
                            {
                                echo "<option value=".$row['x_coordinate'].",".$row['y_coordinate'].">" . $row['Name'] . "</option>";
            
                            }
                         ?>
                        </select>
                        <button id="mov" class="button" style="vertical-align:middle"><span>GO </span></button>
                    </div>
                    <div style="display: none">
                        <div class="PoseX" id="poseX"></div>
                        <div class="PoseY" id="poseY"></div>
                        <div class="PoseLinVel" id="poseLinVel"></div>
                        <div class="PoseTheta" id="poseTheta"></div>
                        <div class="PoseAngVel" id="poseAngVel"></div>
                        <div class="feedbackText" id="feedback"></div>
                        <div class="MoveBaseStatusText" id="movebaseStatus">Status:</div>
                    </div>
                </div>
            </body>
            <html>
