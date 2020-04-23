/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 */

var NAV2D = NAV2D || {
    REVISION: '0.5.0-SNAPSHOT'
};

/**
 * USE INTERNALLY. Resize an Image map when receive new dimension.
 *
 * @param old_state - Previous state
 * @param viewer - Viewer 2D
 * @param currentGrid - Current grid with information about width, height and position
 */
NAV2D.resizeMap = function (old_state, viewer, currentGrid) {
    if (!old_state) {
        old_state = {
            width: currentGrid.width,
            height: currentGrid.height,
            x: currentGrid.pose.position.x,
            y: currentGrid.pose.position.y
        };
        viewer.scaleToDimensions(currentGrid.width, currentGrid.height);
        viewer.shift(currentGrid.pose.position.x, currentGrid.pose.position.y);
    }
    if (old_state.width !== currentGrid.width || old_state.height !== currentGrid.height) {
        viewer.scaleToDimensions(currentGrid.width, currentGrid.height);
        old_state.width = currentGrid.width;
        old_state.height = currentGrid.height;
    }
    if (old_state.x !== currentGrid.pose.position.x || old_state.y !== currentGrid.pose.position.y) {
        viewer.shift((currentGrid.pose.position.x - old_state.x) / 1, (currentGrid.pose.position.y - old_state.y) / 1);
        old_state.x = currentGrid.pose.position.x;
        old_state.y = currentGrid.pose.position.y;
    }
    return old_state;
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A OccupancyGridClientNav uses an OccupancyGridClient to create a map for use with a Navigator.
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * tfClient (optional) - Read information from TF
 *   * topic (optional) - the map meta data topic to listen to
 *   * robot_pose (optional) - the robot topic or TF to listen position
 *   * image_map - the URL of the image to render
 *   * image (optional) - the route of the image if we want to use the NavigationImage instead the NavigationArrow
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 *   * viewer - the main viewer to render to
 */
NAV2D.ImageMapClientNav = function (options) {
    var that = this;
    options = options || {};
    var ros = options.ros;
    var tfClient = options.tfClient || null;
    var topic = options.topic || '/map_metadata';
    var robot_pose = options.robot_pose || '/robot_pose';
    var image_map = options.image_map;
    var image = options.image || false;
    var serverName = options.serverName || '/move_base';
    var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    var rootObject = options.rootObject || new createjs.Container();
    var viewer = options.viewer;
    var withOrientation = options.withOrientation || false;
    var old_state = null;

    // setup a client to get the map
    var client = new ROS2D.ImageMapClient({
        ros: ros,
        rootObject: rootObject,
        topic: topic,
        image: image_map
    });

    var navigator = new NAV2D.Navigator({
        ros: ros,
        tfClient: tfClient,
        serverName: serverName,
        actionName: actionName,
        robot_pose: robot_pose,
        rootObject: rootObject,
        withOrientation: withOrientation,
        image: image
    });

    client.on('change', function () {
        // scale the viewer to fit the map
        old_state = NAV2D.resizeMap(old_state, viewer, client.currentGrid);
    });
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 * @author Raffaello Bonghi - raffaello.bonghi@officinerobotiche.it
 */

/**
 * A navigator can be used to add click-to-navigate options to an object. If
 * withOrientation is set to true, the user can also specify the orientation of
 * the robot by clicking at the goal position and pointing into the desired
 * direction (while holding the button pressed).
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * tfClient (optional) - the TF client
 *   * robot_pose (optional) - the robot topic or TF to listen position
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 */
NAV2D.Navigator = function (options) {
    var that = this;
    var test = "test";
    options = options || {};
    var ros = options.ros;
    var tfClient = options.tfClient || null;
    var robot_pose = options.robot_pose || '/robot_pose';
    var serverName = options.serverName || '/move_base';
    var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    var withOrientation = options.withOrientation || false;
    var use_image = options.image;
    this.rootObject = options.rootObject || new createjs.Container();

    this.goalMarker = null;

    var currentGoal;

    // setup the actionlib client
    var actionClient = new ROSLIB.ActionClient({
        ros: ros,
        actionName: actionName,
        serverName: serverName
    });

    /**
     * Send a goal to the navigation stack with the given pose.
     *
     * @param pose - the goal pose
     */


    function sendGoal(pose) {
        // create a goal
        var goal = new ROSLIB.Goal({
            actionClient: actionClient,
            goalMessage: {
                target_pose: {
                    header: {
                        frame_id: '/map'
                    },
                    pose: pose
                }
            }
        });
        goal.send();

        that.currentGoal = goal;

        // create a marker for the goal
        if (that.goalMarker === null) {
            if (use_image && ROS2D.hasOwnProperty('ImageNavigator')) {
                that.goalMarker = new ROS2D.ImageNavigator({
                    size: 2.5,
                    image: use_image,
                    alpha: 0.7,
                    pulse: true
                });
            } else {
                that.goalMarker = new ROS2D.ArrowShape({
                    size: 10,
                    strokeSize: 3,
                    fillColor: createjs.Graphics.getRGB(255, 255, 0, 0.66),
                    pulse: false
                });
            }
            that.rootObject.addChild(that.goalMarker);
        }
        that.goalMarker.x = pose.position.x;
        that.goalMarker.y = -pose.position.y;
        that.goalMarker.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
        that.goalMarker.scaleX = 1.0 / stage.scaleX;
        that.goalMarker.scaleY = 1.0 / stage.scaleY;

        goal.on('result', function () {
            that.rootObject.removeChild(that.goalMarker);
        });
    }

    /**
     * Cancel the currently active goal.
     */
    this.cancelGoal = function () {
        if (typeof that.currentGoal !== 'undefined') {
            that.currentGoal.cancel();
        }
    };

    // get a handle to the stage
    var stage;
    if (that.rootObject instanceof createjs.Stage) {
        stage = that.rootObject;
    } else {
        stage = that.rootObject.getStage();
    }

    // marker for the robot
    var robotMarker = null;
    var pharmacyMarker = null;

    var room1Marker = null;
var room2Marker = null;
    if (use_image && ROS2D.hasOwnProperty('ImageNavigator')) {
        robotMarker = new ROS2D.NavigationArrow({
            size: 2.5,
            image: use_image,
            pulse: false
        });
        pharmacyMarker = new ROS2D.fillShape({
            size: 2.5,
            image: use_image,
            pulse: true,
toLocaleString: "Pharmacy",
            text: "Pharmacyy"
        });
room1Marker = new ROS2D.fillShape({
            size: 2.5,
            image: use_image,
            pulse: true
        });
room2Marker = new ROS2D.fillShape({
            size: 2.5,
            image: use_image,
            pulse: true
        });
    }
    if (use_image && ROS2D.hasOwnProperty('ImageNavigator')) {
        robotMarker = new ROS2D.NavigationArrow({
            size: 2.5,
            image: use_image,
            pulse: false
        });
        pharmacyMarker = new ROS2D.NavigationArrow({
            size: 1,
            image: use_image,
            pulse: true,
	    toLocaleString: "Pharmacy",
            text: "Pharmacyy"
        });
room1Marker = new ROS2D.NavigationArrow({
            size: 1,
            image: use_image,
            pulse: true
        });
room2Marker = new ROS2D.NavigationArrow({
            size: 1,
            image: use_image,
            pulse: true
        });
    } else {
        robotMarker = new ROS2D.NavigationArrow({
            size: 2,
            strokeSize: 6,
            fillColor: createjs.Graphics.getRGB(255, 69, 0),
            pulse: false
        });
        pharmacyMarker = new ROS2D.NavigationArrow({
            size: 0.01,
            strokeSize: 3,
            fillColor: createjs.Graphics.getRGB(255, 69, 0),
            pulse: true,
toLocaleString: "Pharmacy",
            text: "Pharmacyy"
        });
room1Marker = new ROS2D.NavigationArrow({
            size: 0.01,
            strokeSize: 3,
            fillColor: createjs.Graphics.getRGB(255, 69, 0),
            pulse: true
        });
room2Marker = new ROS2D.NavigationArrow({
            size: 0.01,
            strokeSize: 3,
            fillColor: createjs.Graphics.getRGB(255, 69, 0),
            pulse: true
        });
    }

    // wait for a pose to come in first
    robotMarker.visible = false;
    pharmacyMarker.visible = false;
room1Marker.visible = false;
room2Marker.visible = false;
    this.rootObject.addChild(robotMarker);
    this.rootObject.addChild(pharmacyMarker);
this.rootObject.addChild(room1Marker);
    this.rootObject.addChild(room2Marker);
var initScaleSet = false;
    var initScaleSetPharmacy = false;
 var initScaleSetroom1 = false;
 var initScaleSetroom2 = false;

    var updateRobotPosition = function (pose, orientation) {
        // update the robots position on the map
        robotMarker.x = pose.x;
        robotMarker.y = -pose.y;
        if (!initScaleSet) {
            robotMarker.scaleX = 1.0 / stage.scaleX;
            robotMarker.scaleY = 1.0 / stage.scaleY;
            initScaleSet = true;
        }
        // change the angle
        robotMarker.rotation = stage.rosQuaternionToGlobalTheta(orientation);
        // Set visible
        robotMarker.visible = true;

        room1Marker.x = 2.502;
        room1Marker.y = 0.600;
        if (!initScaleSetroom1) {
            room1Marker.scaleX = 1.0 / stage.scaleX;
           room1Marker.scaleY = 1.0 / stage.scaleY;
            initScaleSetroom1 = true;
        }
        // change the angle
        //pharmacyMarker.rotation = stage.rosQuaternionToGlobalTheta(orientation);
        // Set visible
        room1Marker.visible = true;


pharmacyMarker.x = 2.492;
        pharmacyMarker.y = -0.2;
        if (!initScaleSetPharmacy) {
            pharmacyMarker.scaleX = 1.0 / stage.scaleX;
            pharmacyMarker.scaleY = 1.0 / stage.scaleY;
            initScaleSetPharmacy = true;
        }
        // change the angle
        //room1Marker.rotation = stage.rosQuaternionToGlobalTheta(orientation);
        // Set visible
        pharmacyMarker.visible = true;

room2Marker.x = 0.78;
        room2Marker.y = 0.40;
        if (!initScaleSetroom2) {
            room2Marker.scaleX = 1.0 / stage.scaleX;
            room2Marker.scaleY = 1.0 / stage.scaleY;
            initScaleSetroom2 = true;
        }
        // change the angle
        //room2Marker.rotation = stage.rosQuaternionToGlobalTheta(orientation);
        // Set visible
        room2Marker.visible = true;
    };



    if (tfClient !== null) {
        tfClient.subscribe(robot_pose, function (tf) {
            updateRobotPosition(tf.translation, tf.rotation);
        });
    } else {
        // setup a listener for the robot pose
        var poseListener = new ROSLIB.Topic({
            ros: ros,
            name: robot_pose,
            messageType: 'geometry_msgs/Pose',
            throttle_rate: 100
        });
        poseListener.subscribe(function (pose) {
            updateRobotPosition(pose.position, pose.orientation);
        });
    }


    // setup a double click listener (no orientation)
    // this.rootObject.addEventListener('dblclick', function(event) {
    // convert to ROS coordinates
    //var coords = stage.globalToRos(event.stageX, event.stageY);
    //var pose = new ROSLIB.Pose({
    //  position : new ROSLIB.Vector3(coords)
    //});
    document.getElementById("mov").onclick = function () {
        var counter = 0;
        var target = document.getElementById("TargetLocations").value;
        var splitter = target.split(',');
        var coords = {
            x: parseFloat(splitter[0]),
            y: parseFloat(splitter[1])
        };
        var pose = new ROSLIB.Pose({
            position: new ROSLIB.Vector3(coords)
        });

        sendGoal(pose);

	setTimeout(function(){ 
		//var mo = document.getElementById('goalx').innerHTML;
		//if(mo == "Status: Goal reached.")
		// {
		//alert("Start");
		 var deliver = document.getElementById("DeliverLocation").value;
       		  var spil = deliver.split(',');
        	  var coord = {
            	      x: parseFloat(spil[0]),
            	      y: parseFloat(spil[1])
                  };
                  var pos = new ROSLIB.Pose({
                  position: new ROSLIB.Vector3(coord)
                  });
		  sendGoal(pos);
		 //}

	}, 30000);


    }

    // send the goal
    //sendGoal(pose);
    //});


    //else {
    //
    // // withOrientation === true
    //    // setup a click-and-point listener (with orientation)
    //    var position = null;
    //    var positionVec3 = null;
    //    var thetaRadians = 0;
    //    var thetaDegrees = 0;
    //    var orientationMarker = null;
    //    var mouseDown = false;
    //    var xDelta = 0;
    //    var yDelta = 0;
    //
    //    var mouseEventHandler = function(event, mouseState) {
    //
    //      if (mouseState === 'down'){
    //        // get position when mouse button is pressed down
    //        position = stage.globalToRos(event.stageX, event.stageY);
    //        positionVec3 = new ROSLIB.Vector3(position);
    //        mouseDown = true;
    //      }
    //      else if (mouseState === 'move'){
    //        // remove obsolete orientation marker
    //        that.rootObject.removeChild(orientationMarker);
    //
    //        if ( mouseDown === true) {
    //          // if mouse button is held down:
    //          // - get current mouse position
    //          // - calulate direction between stored <position> and current position
    //          // - place orientation marker
    //          var currentPos = stage.globalToRos(event.stageX, event.stageY);
    //          var currentPosVec3 = new ROSLIB.Vector3(currentPos);
    //
    //          if (use_image && ROS2D.hasOwnProperty('ImageNavigator')) {
    //            orientationMarker = new ROS2D.ImageNavigator({
    //              size: 2.5,
    //              image: use_image,
    //              alpha: 0.7,
    //              pulse: false
    //            });
    //          } else {
    //            orientationMarker = new ROS2D.NavigationArrow({
    //              size : 25,
    //              strokeSize : 1,
    //              fillColor : createjs.Graphics.getRGB(0, 255, 0, 0.66),
    //              pulse : false
    //            });
    //          }
    //
    //          xDelta =  currentPosVec3.x - positionVec3.x;
    //          yDelta =  currentPosVec3.y - positionVec3.y;
    //
    //          thetaRadians  = Math.atan2(xDelta,yDelta);
    //
    //          thetaDegrees = thetaRadians * (180.0 / Math.PI);
    //
    //          if (thetaDegrees >= 0 && thetaDegrees <= 180) {
    //            thetaDegrees += 270;
    //          } else {
    //            thetaDegrees -= 90;
    //          }
    //
    //          orientationMarker.x =  positionVec3.x;
    //          orientationMarker.y = -positionVec3.y;
    //          orientationMarker.rotation = thetaDegrees;
    //          orientationMarker.scaleX = 1.0 / stage.scaleX;
    //          orientationMarker.scaleY = 1.0 / stage.scaleY;
    //
    //          that.rootObject.addChild(orientationMarker);
    //        }
    //      } else if (mouseDown) { // mouseState === 'up'
    //        // if mouse button is released
    //        // - get current mouse position (goalPos)
    //        // - calulate direction between stored <position> and goal position
    //        // - set pose with orientation
    //        // - send goal
    //        mouseDown = false;
    //
    //        var goalPos = stage.globalToRos(event.stageX, event.stageY);
    //
    //        var goalPosVec3 = new ROSLIB.Vector3(goalPos);
    //
    //        xDelta =  goalPosVec3.x - positionVec3.x;
    //        yDelta =  goalPosVec3.y - positionVec3.y;
    //
    //        thetaRadians  = Math.atan2(xDelta,yDelta);
    //
    //        if (thetaRadians >= 0 && thetaRadians <= Math.PI) {
    //          thetaRadians += (3 * Math.PI / 2);
    //        } else {
    //          thetaRadians -= (Math.PI/2);
    //        }
    //
    //        var qz =  Math.sin(-thetaRadians/2.0);
    //        var qw =  Math.cos(-thetaRadians/2.0);
    //
    //        var orientation = new ROSLIB.Quaternion({x:0, y:0, z:qz, w:qw});
    //
    //        var pose = new ROSLIB.Pose({
    //          position :    positionVec3,
    //          orientation : orientation
    //        });
    //        // send the goal
    //        //sendGoal(pose);
    //      }
    //    };
    //
    //    this.rootObject.addEventListener('stagemousedown', function(event) {
    //      mouseEventHandler(event,'down');
    //    });
    //
    //    this.rootObject.addEventListener('stagemousemove', function(event) {
    //      mouseEventHandler(event,'move');
    //    });
    //
    //    this.rootObject.addEventListener('stagemouseup', function(event) {
    //      mouseEventHandler(event,'up');
    //    });
    //  }
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A OccupancyGridClientNav uses an OccupancyGridClient to create a map for use with a Navigator.
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * tfClient (optional) - Read information from TF
 *   * topic (optional) - the map topic to listen to
 *   * robot_pose (optional) - the robot topic or TF to listen position
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 *   * image (optional) - the route of the image if we want to use the NavigationImage instead the NavigationArrow
 *   * viewer - the main viewer to render to
 */
NAV2D.OccupancyGridClientNav = function (options) {
    var that = this;
    options = options || {};
    var ros = options.ros;
    var tfClient = options.tfClient || null;
    var map_topic = options.topic || '/map';
    var robot_pose = options.robot_pose || '/robot_pose';
    var continuous = options.continuous;
    var serverName = options.serverName || '/move_base';
    var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    var rootObject = options.rootObject || new createjs.Container();
    var viewer = options.viewer;
    var withOrientation = options.withOrientation || false;
    var image = options.image || false;
    var old_state = null;

    // setup a client to get the map
    var client = new ROS2D.OccupancyGridClient({
        ros: ros,
        rootObject: rootObject,
        continuous: continuous,
        topic: map_topic
    });

    var navigator = new NAV2D.Navigator({
        ros: ros,
        tfClient: tfClient,
        serverName: serverName,
        actionName: actionName,
        robot_pose: robot_pose,
        rootObject: rootObject,
        withOrientation: withOrientation,
        image: image
    });

    client.on('change', function () {
        // scale the viewer to fit the map
        old_state = NAV2D.resizeMap(old_state, viewer, client.currentGrid);
    });
};
entNav = function (options) {
    var that = this;
    var pharmacy = this;
    var room1 = this;
    var room2 = this;
    options = options || {};
    var ros = options.ros;
    var tfClient = options.tfClient || null;
    var map_topic = options.topic || '/map';
    var robot_pose = options.robot_pose || '/robot_pose';
    var continuous = options.continuous;
    var serverName = options.serverName || '/move_base';
    var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    var rootObject = options.rootObject || new createjs.Container();
    var viewer = options.viewer;
    var withOrientation = options.withOrientation || false;
    var image = options.image || false;
    var old_state = null;

    // setup a client to get the map
    var client = new ROS2D.OccupancyGridClient({
        ros: ros,
        rootObject: rootObject,
        continuous: continuous,
        topic: map_topic
    });

    var navigator = new NAV2D.Navigator({
        ros: ros,
        tfClient: tfClient,
        serverName: serverName,
        actionName: actionName,
        robot_pose: robot_pose,
        rootObject: rootObject,
        withOrientation: withOrientation,
        image: image
    });

    client.on('change', function () {
        // scale the viewer to fit the map
        old_state = NAV2D.resizeMap(old_state, viewer, client.currentGrid);
    });
};
