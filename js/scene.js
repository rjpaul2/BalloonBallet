// Possible color pairs the paint pairs can take on
var colors =[ 
         	0xffffff * Math.random(),
         	0xffffff * Math.random(),
         	0xffffff * Math.random(),
         	0xffffff * Math.random(),
         	0xffffff * Math.random(),
         	0xffffff * Math.random(),
         	0xffffff * Math.random(),
         	0xffffff * Math.random(),
         ];
//TODO:  camera moves on mouse
//THREE
var scene,
    camera, fieldOfView = 60, aspectRatio, nearPlane = 1, farPlane = 10000,
    renderer, container;

//CANNON
var world, timeStep, body; 

//var controls;

//Screen
var HEIGHT, WIDTH;

// Audio
var audioListener, sound1, sound2, audioLoader;

// Decals 
var loader = new THREE.TextureLoader();
var splatterMaterial = new THREE.MeshPhongMaterial( {
	specular: 0xffffff,
	shininess: 100,
	map: loader.load( 'img/splatter-diffuse.png' ),
	normalMap: loader.load( 'img/splatter-normal.jpg' ),
	normalScale: new THREE.Vector2(1.0,1.0),
    transparent: true, 
	depthTest: true,   
	depthWrite: false,   
	polygonOffset: true,  
	polygonOffsetFactor: -4,   
	wireframe: false 
});

//Balloon Material
var rubber; 
var rubber_rubber;


function initCannon(){
	world = new CANNON.World();
	world.gravity.set(0,0,70);  //Positive to give the appeal of helium
	world.broadphase = new CANNON.NaiveBroadphase(); // Collision
	world.solver.iterations = 10;
	
	// Materials
    rubber = new CANNON.Material('rubber');  
    rubber_rubber = new CANNON.ContactMaterial(rubber, rubber, {
      friction: 0.95,
      restitution: 0.9,
      contactEquationStiffness: 1e5,
      contactEquationRelaxation: 2,
      frictionEquationStiffness: 1e8,
      frictionEquationRelaxation: 2
    });
       
    world.addContactMaterial(rubber_rubber);
  
	timeStep = 1.0/60.0; // 60Hz	
}

//Original camera parameters (Messy but neat in the final scene)
     
const OG_CAM_POS_X = -1.7444381359663044;     
const OG_CAM_POS_Y = 42; 
const OG_CAM_POS_Z = 16.58729214144528;

const OG_CAM_ROT_X =  -Math.PI/2;
const OG_CAM_ROT_Y = 0;
const OG_CAM_ROT_Z = Math.PI ;

//Current camera positions (updated in OnMouseMove())
var camPosX = OG_CAM_POS_X;
var camPosY = OG_CAM_POS_Y;

function initThree(){
	document.addEventListener( 'mousedown', onMouseDown, false ); //Listen and handle mouse down events for the game
	document.addEventListener( 'mousemove', onMouseMove, false ); //Listen and handle mouse move events for the game

	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	scene = new THREE.Scene();
	aspectRatio = WIDTH / HEIGHT;
	camera = new THREE.PerspectiveCamera(
			fieldOfView,
			aspectRatio,
			nearPlane,
			farPlane
    );
	//scene.fog = new THREE.Fog(0xf7d9aa, 0,100);

	camera.position.x = OG_CAM_POS_X;
	camera.position.y = OG_CAM_POS_Y;
	camera.position.z = OG_CAM_POS_Z;
  
  
	camera.rotation.x = OG_CAM_ROT_X;
	camera.rotation.y = OG_CAM_ROT_Y;
	camera.rotation.z = OG_CAM_ROT_Z;
	     

	renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
	renderer.setSize(WIDTH, HEIGHT);
	renderer.shadowMap.enabled = true;
	container = document.getElementById('world');
	container.appendChild(renderer.domElement);

    //controls = new THREE.TrackballControls(camera);
  
	window.addEventListener('resize', handleWindowResize, false);
	
	/*Audio*/
	audioListener = new THREE.AudioListener();
	camera.add(audioListener);
	
	//TODO: Possible to break sound if clicking fast enough
	sound1 = new THREE.Audio(audioListener);
	sound2 = new THREE.Audio(audioListener);
	
	audioLoader = new THREE.AudioLoader();	
}

/*Window resize*/
function handleWindowResize(){
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}

var ambientLight, hemisphereLight, shadowLight;
/*Lights*/
function createLights(){

	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, 0.9);

	ambientLight = new THREE.AmbientLight(0x7483dc, .5);

	shadowLight = new THREE.DirectionalLight(0xffffff, .9);
	shadowLight.position.set(150, 150, 350);
	//shadowLight.position.set(20, 20, 0);
	shadowLight.castShadow = true;
	shadowLight.shadow.camera.left = -40;
	shadowLight.shadow.camera.right = 40;
	shadowLight.shadow.camera.top = 40;
	shadowLight.shadow.camera.bottom = -40;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	scene.add(hemisphereLight);
	scene.add(shadowLight);
	scene.add(ambientLight);
}

/*Creates the planes for which the balloons rest, also connects the mesh to the static rigid body*/
var backdrop; //splatter backdrop mesh
var groundBody; //static ground plane 
function createPlanes(){
	var groundShape = new CANNON.Plane();
	groundBody = new CANNON.Body({mass: 0, shape: groundShape}); //Static
	
	var backdropGeo = new THREE.BoxGeometry(300, 200, 1);
	var backdropMat = new THREE.MeshPhongMaterial({transparent: true, opacity: 0.0});
	backdrop = new THREE.Mesh(backdropGeo, backdropMat);
	backdrop.receiveShadow = true;
	//backdrop.castShadow = true;
	backdrop.rotation.x = Math.PI/2;
	backdrop.position.y = -20;
	//backdrop.position.y = -5;
	backdrop.position.z = 25;
//aeb5ea
	var groundGeo = new THREE.BoxGeometry(300, 200, 1);
	//var groundMat = new THREE.MeshPhongMaterial({transparent: true, opacity: 1.0, color: 0xafb6e9});
	var groundMat = new THREE.ShadowMaterial({opacity: 0.5});
	var ground = new THREE.Mesh(groundGeo, groundMat);
	ground.receiveShadow = true;
	
	scene.add(ground);
	scene.add(backdrop);
	world.add(groundBody);
}
/* Creates a rope given a balloon body. A rope is a series on rectangular meshes/bodies. Each mesh/body is stored in 
 * ropeMeshes/ropeBodies and each of those are stored in the global ropeMeshesMeshes/ropeBodiesBodies for use
 * in updating the physics of the rope
 */
//Arrays to hold the meshes of the meshes and the bodies of the bodies for each individual instanstiated balloon
var ropeBodiesBodies = [];
var ropeMeshesMeshes = [];
var Rope = function(balloonBody, x, y, lengthRope){
	//Local rope mesh and body segment arrays
	this.ropeBodies = []; 
	this.ropeMeshes = [];
	
	this.body = new CANNON.Body();
	var size = 0.2;
    var dist = size*2+0.12;
    
    var bodySegmentShape = new CANNON.Box(new CANNON.Vec3(0.02,0.02,dist));
    var mass = 1;
    var lastBody = null;
    //var N = Math.floor(Math.random()*40)+10;//Random Height
    //var N = Math.floor(((MAX_BALLOONS - num_balloons + 2)/MAX_BALLOONS) * 45) ;// Increasing height as balloons get added
    //var N = Math.floor(((MAX_BALLOONS - num_balloons + 2)/MAX_BALLOONS) * 15 + 35);
    var ropeMat = new THREE.LineBasicMaterial( { color: 0x787878, transparent: true, opacity: 1.0 } );
    this.mesh = new THREE.Object3D();
    this.mesh.name = "rope";
    //world.solver.iterations = N; // To be able to propagate force throw the chain of N spheres, we need at least N solver iterations.
    for(var i=0; i<lengthRope; i++){
    	/*BODY WORK*/
    	mass = i + 1;

    	var ropeBody = new CANNON.Body({ 
    		mass: mass,
    		linearDamping: 0.85,
    		angularDamping: 0.95});
      
    	ropeBody.addShape(bodySegmentShape);
    	ropeBody.position.set(x,y,(lengthRope-i-22)*dist);
    	ropeBody.velocity.x = i; //Wind
      
    	this.ropeBodies.push(ropeBody);
    	world.add(ropeBody);

      // Connect this body to the last one added
    	var c;
    	if(i === lengthRope - 1){//If we're at our last segment, connect it to the plane
    		//world.addConstraint(c = new CANNON.DistanceConstraint(ropeBody, groundBody, dist));
    		world.addConstraint(c = new CANNON.PointToPointConstraint(ropeBody,new CANNON.Vec3(0,0,-size),groundBody,new CANNON.Vec3(x,y,size)));
    		world.addConstraint(c = new CANNON.PointToPointConstraint(ropeBody,new CANNON.Vec3(0,0,size),lastBody,new CANNON.Vec3(0,0,-size)));
    	}
    	else if(lastBody!==null){// If we're in the middle segment, connect to each other
    		world.addConstraint(c = new CANNON.PointToPointConstraint(ropeBody,new CANNON.Vec3(0,0,size),lastBody,new CANNON.Vec3(0,0,-size)));
    	}     
      //Else connect first segment of string to balloon
    	else{
    		world.addConstraint(c = new CANNON.PointToPointConstraint(ropeBody,new CANNON.Vec3(0,0,size),balloonBody,new CANNON.Vec3(0,-0.6,0)));
    		//world.addConstraint(c = new CANNON.DistanceConstraint(ropeBody, balloonBody, 0.35));
    	}

      // Keep track of the lastly added body
      lastBody = ropeBody;
      
      /*MESH WORK*/
      
		var ropeGeo = new THREE.BoxBufferGeometry(0.02,0.02,dist);
		var ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
		ropeMesh.castShadow = true;
		//ropeMesh.receiveShadow = true;
		ropeMesh.position.set(0,0,(lengthRope-i)*dist);
		this.ropeMeshes.push(ropeMesh);
      
		this.mesh.add(ropeMesh);      
	}   

    ropeMeshesMeshes.push(this.ropeMeshes);
    ropeBodiesBodies.push(this.ropeBodies);
    
    scene.add(this.mesh);
}
var num_balloons = 0; //Current number of balloons
const BALLOONS_COLOR = 0x3333ff;
/*Creates a Balloon mesh and attaches it and assosiates it with a rope
 * Please excuse the "trail and error" numbers used -- Blender didn't work out for me
 * @param x : x-cord on horizontal plane
 * @param y: y-param on the horizontal plane
 * @param lengthRope: how many segments the rope should be MUST BE INTEGER 
 * @param color: the color of the paint splatter, inside the balloon
 */
var Balloon = function(scale, x, y, lengthRope, color){
	/*MESH WORK*/
	this.mesh = new THREE.Object3D();
	this.mesh.name = "balloon";

	var balloonMat = new THREE.MeshPhongMaterial({
		color: BALLOONS_COLOR, 
		transparent: true, 
		opacity: 0.9,
		specular: BALLOONS_COLOR,
		shininess: 100});
	
	// Top of the Balloon
	var radius = 7; var widthSegments = 14; var heightSegments = 8; var phiStart = 0; var phiLength = 6.285; var thetaStart = 0; var thetaLength = 2.095 
	var topGeo = new THREE.SphereBufferGeometry(radius,widthSegments,heightSegments,phiStart,phiLength,thetaStart,thetaLength);
	var top = new THREE.Mesh(topGeo, balloonMat);
	top.castShadow = true;
	top.receiveShadow = true;
	this.mesh.add(top);
	
	// Torso of Balloon
	var radiusTop = 6.07; var radiusBottom = 0.6; var height = 12; var openEnded = true; var thetaStart2 = 1.58; var thetaLength2 = 6.285;
	var torsoGeo = new THREE.CylinderBufferGeometry(radiusTop, radiusBottom, height, widthSegments, heightSegments, openEnded, thetaStart2, thetaLength2);
	var torso = new THREE.Mesh(torsoGeo, balloonMat);
	torso.position.y = -9.5; // Position the body appropriately
	torso.castShadow = true;
	torso.receiveShadow = true;
	this.mesh.add(torso);
	
	// Bottom of Balloon
	var bottomGeo = new THREE.OctahedronBufferGeometry();
	var bottom = new THREE.Mesh(bottomGeo, balloonMat);
	bottom.position.y = -15.9;
	bottom.castShadow = true;
	bottom.receiveShadow = true;
	this.mesh.add(bottom);
	
	this.mesh.rotation.x = Math.PI/2; //Orient Vertically
	this.mesh.scale.set(scale,scale,scale);
	
	/*BODY WORK*/
	// Main Balloon Body
	this.body = new CANNON.Body({
		material: rubber,
		mass: 2,
		linearDamping: 0.99,
  	  	angularDamping: 1.0});
	
	// Similar shape and position of the top mesh (need to shift up instead so the anchor can be at (0,0,0), need to also shift up the balloon mesh
	this.body.addShape(new CANNON.Sphere(radius * scale), new CANNON.Vec3(0,-1* scale * bottom.position.y,0));
	
	
	// Similar shape and position of the bottom mesh (this is the anchor for which the rope will attatch
	this.body.addShape(new CANNON.Box(new CANNON.Vec3(scale,scale,scale)));
	

	this.body.quaternion.copy(this.mesh.quaternion); //Orient the body the same way as the mesh (get on the same
	
	/*ROPE*/
	this.mesh.rope = new Rope(this.body, x, y, lengthRope); //Keep track of the rope in the object
	
	
	//View the Rigid Bodies (need cannon.demo.js, Detector.js, smoothie.js, TrackballControls.js, and Stats.js)
	/*
	var demo = new CANNON.Demo();
	demo.addVisual(this.body);
	for(var i = 0; i < this.mesh.rope.ropeBodies.length; i++){
		demo.addVisual(this.mesh.rope.ropeBodies[i]); 
	}
	*/
	/*Keep track of color and body with the object*/
	this.mesh.color = color;
	this.mesh.body = this.body;
	
	this.body.position.set(x,y,0); //Place the balloon so it looks nice at startup
	scene.add(this.mesh);
	world.add(this.body);
	
	num_balloons++; //One more balloon on the map
}
var balloonMeshes = [];
var balloonBodies = [];
const MAX_BALLOONS = 8; //Final number of balloons

/*Places balloons sporadically in the scene*/
function addBalloons(){
	var N = 8;//Number of balloons (should be even for the game)
	var x,y,length;
	for( var i = 0; i <MAX_BALLOONS; i++){
		/*Upside-down pyramid design (like the UP movie)
		 * VERY Messy way to orient these balloons -- TODO: make prettier for balloons different from 8*/
		switch(i){
		case 0:
			length = 28;x = 0;y = 10;break;
		case 1:
			x = 2;y = 9;length = 35;break;
		case 2:
			x = 0;y = 8;length = 40;break;
		case 3:
			x = -2;y = 9;length = 35;break;
		case 4:
			x = -1;y = 5;length = 48;break;
		case 5:
			x = 1;y = 4.5;length = 50;break;
		case 6:
			x = -2.7;y = 6;length = 42;break;
		case 7:	
			x = 2.7;y = 7;length = 42;break;
		default:
			x = 0;y = 7;length=30;break;
		}
		balloon = new Balloon(0.25,
				x,
				y,
				//0,//Math.floor(Math.random() * 60) - 30, //Random position x in [30, -30]
				//7,//Math.floor(Math.random() * 40)- 20, //y in [20, -20]
				//Math.floor(((MAX_BALLOONS - num_balloons + 2)/MAX_BALLOONS) * 45), // Increasing height as balloons get added
				length - 4,
				colors[i%(MAX_BALLOONS/2)]); //colored pairs
		//Update globals
		balloonMeshes.push(balloon.mesh);
		balloonBodies.push(balloon.body);
	
		//TODO: MIGHT NOT NEED THIS?
		meshToBody(balloon.mesh, balloon.body); //Match body position/rotation to mesh
	}		
}

/*Main loop*/
function render(){
	requestAnimationFrame(render);
	renderer.render(scene, camera);
	updatePhysics();
	updateCamera();
	checkDone();
	//controls.update();
	//console.log(camera.position.x + " " +  camera.position.y + " " +  camera.position.z + " " +  camera.rotation.x + " " +  camera.rotation.y + " " +  camera.rotation.z);
	//console.log(balloonBody.position + " " +  balloonMesh.rope);
}

function updateCamera(){
	camera.position.x = camPosX;
	camera.position.y = camPosY
}

/*Updates mesh and body connections and steps the physics*/
function updatePhysics(){
	// Step the physics world
	world.step(timeStep);
	for(var i = 0; i < balloonBodies.length; i++){
		balloonMeshes[i].position.copy(new THREE.Vector3(balloonBodies[i].position.x, balloonBodies[i].position.y, balloonBodies[i].position.z + 3.4)); //Match balloon mesh and body positions (align them)
		balloonBodies[i].quaternion.copy(balloonMeshes[i].quaternion); //Make sure the body's quaternion doesn't freak out and stays upright like the mesh
	}
	//balloonMesh.quaternion.copy(balloonBody.quaternion);
	//For each rope mesh on the map, update the ripe segment meshes to their corresponding body segments
	for(var i = 0; i < ropeBodiesBodies.length; i++){
		for(var j = 0; j < ropeBodiesBodies[i].length; j++){ //Update Ropes 
			meshToBody(ropeMeshesMeshes[i][j],ropeBodiesBodies[i][j]);
		}
	}
}
/*Connects the coordinates of a Three.js mesh to a Cannon.js body - should be similar shapes
 * @ param mesh: Three.js mesh
 * @ param body: Connon.js rigid body
 * */
function meshToBody(mesh, body){
	// Copy coordinates from Cannon.js to Three.js
	mesh.position.copy(body.position);
	mesh.quaternion.copy(body.quaternion);
}

function init(event){
	initThree();
	initCannon();
	createLights();
	createPlanes();
	addBalloons();
	render();
}

/*Checks if we have finished the game and if so continue with the ending simulation*/
function checkDone(){
	//If we popped all of the balloons
	if(num_balloons === 0){
		num_balloons = 1000;//So we only commit done actions once
		//Commit fade out actions
		setTimeout(function(){
			$("#world").fadeOut(3000);
			//After the world is faded out fade in button
			setTimeout(function(){
				$("#button").fadeIn(2000);
				//After everything transitions add a transition property to the button to make hovers look nice
				setTimeout(function(){ 
					$("#button").css('-webkit-transition-duration','0.4s'); //Safari
					$("#button").css('transition-duration','0.4s');
				}, 1000);
			}, 3000);
		}, 1000)		
	}
}

const TOL = 0.05; //Max distance between the current and new cam position before a tween animation is required
/*Updates camera location based on mouse position*/
function onMouseMove(e){
	var currTween = {currX: camPosX, currY: camPosY}
	//Smooth exponential function
	var newCamPosX = OG_CAM_POS_X + Math.exp(((e.clientX/renderer.domElement.width) * 2 - 1) / 2);
	var newCamPosY = OG_CAM_POS_Y - Math.exp(((e.clientY/renderer.domElement.height) * 2 + 1) / 2);
	
	//Interpolation
	if(Math.abs(newCamPosX - camPosX) > TOL) 
		TweenLite.to(currTween, 1.0, {currX: newCamPosX, onUpdate: function(){
			camPosX = currTween.currX;
		}});
	if(Math.abs(newCamPosY - camPosY) > TOL) 
		TweenLite.to(currTween, 1.0, {currY: newCamPosY, onUpdate: function(){
			camPosY = currTween.currY;
		}});
}

	var currBalloon = null;
/* Handler for user clicks */
function onMouseDown(e){
	HEIGHT = window.innerHeight; //Update window size
	WIDTH = window.innerWidth; 
	
	/*This works for a perspective camera only*/
	var raycaster = new THREE.Raycaster();
	var mouseVector = new THREE.Vector3();
	mouseVector.x = (e.clientX/renderer.domElement.width) * 2 - 1
	mouseVector.y = -(e.clientY/renderer.domElement.height) * 2 + 1
	mouseVector.z = 0.5;
	
	//Compute the origin and normalized direction of the mouse click
	mouseVector.unproject(camera);
	raycaster.set(camera.position, mouseVector.sub(camera.position).normalize());

	// If the mouse intersects a balloon, pop the balloon
	var balloonIntersects = raycaster.intersectObjects(balloonMeshes,true); 
	// If the mouse intersects with the backdrop, splatter on the backdrop
	var wallIntersects = raycaster.intersectObject(backdrop,true);
	if(balloonIntersects[0]){
	    var balloon = balloonIntersects[0].object.parent; //Closest intersect
	    /*These are the game rules*/
	    if(currBalloon != null){//If we're on our second guess
	    	if(currBalloon.color == balloon.color){//If we make the right guess
	    		pop(balloon);
	    	    if(wallIntersects[0]){ //If the wall is in our path of the pop
	    			splatterOnBackDrop(wallIntersects[0].point.clone(),balloon.color);
	    		}
	    	    //Remove both bodies
	    	    removeBalloonAndRopeBody(currBalloon);
	    	    removeBalloonAndRopeBody(balloon);
	    	}
	    	else{//If we match with the wrong balloon, restore the first balloon, and flash wrong the clicked balloon, and play a "wrong" tone
	    		flashRed(balloon);
	    		unpop(currBalloon);
	    		audioLoader.load( 'sounds/wrong.mp3', function(buffer){
	    			sound2.setBuffer(buffer);
	    			sound2.setLoop(false);
	    			sound2.setVolume(0.3);
	    			sound2.play();
	    		});
	    	}
	    	currBalloon = null;//In any case, try again
	    }
	    else{//If this is our first guess, pop the balloon and set up game for second guess
		    pop(balloon);
		    if(wallIntersects[0]){ //If the wall is in our path of the pop
				splatterOnBackDrop(wallIntersects[0].point.clone(),balloon.color);
			}
		    currBalloon = balloon;
	    }
	}
}
const COLLAPSE_TIME = 1000; //Time it takes after a pop that the rope dissapears
/*Hides balloon object mesh, sounds a "pop" tone, collapses the rope
 * @param balloon: the Balloon object at hand
 */
function pop(balloon){
	balloon.visible = false; //"Pop" the balloon
	//Make "Pop" Noise
	
	audioLoader.load( 'sounds/balloon_pop.ogg', function(buffer){
		sound1.setBuffer(buffer);
		sound1.setLoop(false);
		sound1.setVolume(0.3);
		sound1.play();
	});
	
	//Make the rope fall (necessary because gravity is upwards)
	for(var i = 0; i < balloon.rope.ropeBodies.length; i++){
		balloon.rope.ropeBodies[i].velocity.y = -1*Math.sqrt(i); //Simulate gravity in the opposite direction
	}

	//Make the rope disappear after COLLAPSE_TIME milliseconds 
	setTimeout(function(rope){
		if(balloon.visible == false){//Only hide the rope if the balloon is currently hidden
			for(var i = 0; i < balloon.rope.ropeMeshes.length; i++){
				balloon.rope.ropeMeshes[i].visible = false; 
			}
		}
	},COLLAPSE_TIME);
	
}
/*Restores the balloon and rope in the case that a wrong guess was made
 * @param balloon: the Balloon object at hand
 */
function unpop(balloon){
	balloon.visible = true;
	for(var i = 0; i < balloon.rope.ropeMeshes.length; i++){
		balloon.rope.ropeMeshes[i].visible = true; 
	}
}
/* Splatters a color mesh onto the global mesh "backdrop" with normal vector (0,0,1) (must be flat)
 * @param postition: the position on the wall the splatter
 * @param color: color of the splatter
 */
function splatterOnBackDrop(position, color){
	//Randomize Rotation
	var rotation = new THREE.Vector3(-1,0,0);
	rotation.z = Math.random() * 2 * Math.PI;
	
	//Randomize scale between 12 - 32
	var scale = 8 + Math.random() * 10;
	
	//Colors
	var material = splatterMaterial.clone();
	material.color.setHex(color);

	var splatter = new THREE.Mesh(new THREE.DecalGeometry(backdrop, position, rotation, new THREE.Vector3(scale,scale,scale), new THREE.Vector3(1,1,1)), material);
	scene.add(splatter);
}
/*Flashes the incorrectly clicked balloon red to signify wrong click
 * @param balloon: the Balloon object at hand
 */
function flashRed(balloon){
	for(var i = 0; i < balloon.children.length; i++){
		balloon.children[i].material.color.setHex(0xfd3730);
	}
	setTimeout(function(){
			for(var i = 0; i < balloon.children.length; i++){
				balloon.children[i].material.color.setHex(BALLOONS_COLOR);
			}
		}
	, 70);
}

/*Removes the balloon body and its corresponding rope body from the CANNON world
 * @param balloon: the Balloon object at hand
 */
function removeBalloonAndRopeBody(balloon){
	//Remove balloons
	world.removeBody(balloon.body);

    //Remove rope segments after the rope gets hidden
	setTimeout(function(){
		for(var i = 0; i <balloon.rope.ropeBodies.length; i++){
			world.removeBody(balloon.rope.ropeBodies[i]);
			//TODO: Note that the global tracker ropeBodiesBodies and is untouched
		}
	}, COLLAPSE_TIME);
	num_balloons--;//Update number of balloons in the world	
}
window.addEventListener('load', init, false);
