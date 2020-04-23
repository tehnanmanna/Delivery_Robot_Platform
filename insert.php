<html>

<body>

 

 

<?php

$con = mysqli_connect("localhost","root","");

if (!$con)

  {

  die('Could not connect: ' . mysql_error());

  }

 

mysqli_select_db($con,"robot_navigation");

 

$sql="INSERT INTO locations (Name, x_coordinate,y_coordinate)

VALUES

('$_POST[loc_name]','$_POST[loc_x]','$_POST[loc_y]')";

 

if (!mysqli_query($con,$sql))

  {

  die('Error: ' . mysqli_error($con));

  }


echo "1 record added";

 

mysqli_close($con)

?>

</body>

</html>