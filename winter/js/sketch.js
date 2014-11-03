// if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var stats;
var camera, controls, scene, renderer;

var dirLight, hemiLight;

var theta;
var cameraAngle = 60;

var loader;
var time = 1000
var gravity = 1;
var isWireframe = false;

var seaGeometry;

var yNoise = 0.0;

var texture = THREE.ImageUtils.loadTexture( 'images/snowflake.jpg' );

var islandHeightmap = new Image();
var mountainHeightmap = new Image();

var cartoonTrees = new THREE.Object3D();
var lighthouseContainer = new THREE.Object3D();


init();
animate();

function init() {

	islandHeightmap.src = "images/heightmap_island.jpg";
	mountainHeightmap.src = "images/heightmap_mountains.png";


	var manager = new THREE.LoadingManager();
	loader = new THREE.OBJLoader( manager );
	loader.load( 'models/cartoonTree.obj', function ( tree ) {


		tree.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {
           		child.material.color.setRGB (122/255, 139/255, 68/255);
			}
		} );

			for ( var i = 0; i < 300; i ++ ) {
			    var mesh = tree.clone();
			    var scaleVal = Math.random() * (1 - 0.5) + 0.5;
			    mesh.position.set( Math.random() * 200 -80, Math.random() * 10 - 10 , Math.random() * 300 -15 );

			    // mesh.position.set( Math.random() * 8000 - 4000, Math.random() * 200 - 100, Math.random() * 8000 - 4000 );
			    mesh.rotation.z = -Math.PI/9;
			    mesh.scale.set(scaleVal,scaleVal,scaleVal);
				cartoonTrees.add(mesh);

			}
	});


	var loader = new THREE.ObjectLoader();
	loader.load("models/lighthouse.js",function ( lighthouse ) {
	  	lighthouseContainer.add( lighthouse );
	});

	stats = new Stats();
	stats.setMode(0); // 0: fps, 1: ms

	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';

	document.body.appendChild( stats.domElement );

	stats.begin();


	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );


	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 100, 14500 );

	camera.position.y = 400;

	camera.position.z = 1200;

	//TRACKBALL CONTROLS
	controls = new THREE.TrackballControls( camera);

	controls.rotateSpeed = 1.0;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;

	controls.noZoom = false;
	controls.noPan = true;

	controls.staticMoving = false;
	controls.dynamicDampingFactor = 0.3;

	controls.keys = [ 65, 83, 68 ];


	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2( 0x000000, 0.0002 );


	// spaceshipPivot.add(camera);

	scene.add(lighthouseContainer);	
	lighthouseContainer.position.y = 420;
	lighthouseContainer.position.x = 160;
	lighthouseContainer.position.z = 50;




	cartoonTrees.rotation.z = Math.PI/10;
	cartoonTrees.rotation.y = -Math.PI/3;


	cartoonTrees.position.x = 100;
	cartoonTrees.position.y = 240;
	cartoonTrees.position.z = -200;



	scene.add(cartoonTrees);


	// LIGHT
	var light = new THREE.SpotLight(0x999999, 1);
    	light.castShadow = true;
    	light.shadowDarkness = .3;
    	light.position.set(0, 530, 0);
    	scene.add(light);

    var light = new THREE.PointLight(0x999999, .6);
    	light.position.set(500, 400, 0);
    	scene.add(light);

  

 	hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.4 );
	hemiLight.color.setHSL( 0.6, 1, 0.6 );
	hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
	hemiLight.position.set( 0, 500, 0 );
	scene.add( hemiLight );




	// SKYDOME
	var vertexShader = document.getElementById( 'vertexShader' ).textContent;
	var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
	var uniforms = {
		topColor: 	 { type: "c", value: new THREE.Color( 0x0077ff ) },
		bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
		offset:		 { type: "f", value: 33 },
		exponent:	 { type: "f", value: 0.6 }
	}
	uniforms.topColor.value.copy( hemiLight.color );

	scene.fog.color.copy( uniforms.bottomColor.value );

	var skyGeo = new THREE.SphereGeometry( 10000, 32, 15 );
	var skyMat = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );

	var sky = new THREE.Mesh( skyGeo, skyMat );
	scene.add( sky );



	//LOADING HEIGHTMAP
	function getHeightData(img,scale) {
  
	 if (scale == undefined) scale=1;
	  
	    var canvas = document.createElement( 'canvas' );
	    canvas.width = img.width;
	    canvas.height = img.height;
	    var context = canvas.getContext( '2d' );
	 
	    var size = img.width * img.height;
	    var data = new Float32Array( size );
	 
	    context.drawImage(img,0,0);
	 
	    for ( var i = 0; i < size; i ++ ) {
	        data[i] = 0
	    }
	 
	    var imgd = context.getImageData(0, 0, img.width, img.height);
	    var pix = imgd.data;
	 
	    var j=0;
	    for (var i = 0; i<pix.length; i +=4) {
	        var all = pix[i]+pix[i+1]+pix[i+2];
	        data[j++] = all/(12*scale);
	    }
	     
	    return data;
	}


	//GENERATING MOUNTAINS
	mountainHeightmap.onload = function () {
	  
	    //get height data from img
	    var data = getHeightData(mountainHeightmap,0.02);
	  
	    // plane
	    var mountainGeometry = new THREE.PlaneGeometry(13000,13000,31,31);
	    // var groundTexture = THREE.ImageUtils.loadTexture( 'images/textures/snow.jpg' );
		var colorBrown = new THREE.Color("rgb(73,49,28)");

       	var mountainMaterial = new THREE.MeshPhongMaterial({
       		shading: THREE.FlatShading,
       	    wireframe: false,
       	    color: colorBrown
       	    // map: groundTexture
       	    // emissive: 0xffffff
       	});

        //set height of vertices
	    for ( var i = 0; i<mountainGeometry.vertices.length; i++ ) {
	         mountainGeometry.vertices[i].z = data[i];
	    }

        mountainGeometry.computeFaceNormals();

	    mountainMesh = new THREE.Mesh( mountainGeometry, mountainMaterial );
	  	 
		mountainMesh.rotation.x = Math.PI / 180 * (-90);
		mountainMesh.rotation.z = Math.PI / 180 * (-25);
		mountainMesh.position.y = -200;


	    scene.add(mountainMesh);

		//GENERATING MOUNTAINS SNOW
	  
	    //get height data from img
	    var data = getHeightData(mountainHeightmap,0.01);
	  
	    // plane
	    var mountainGeometry2 = new THREE.PlaneGeometry(13000,13000,31,31);
	    // var groundTexture = THREE.ImageUtils.loadTexture( 'images/textures/snow.jpg' );
		var colorWhite = new THREE.Color("rgb(255,255,255)");

       	var mountainMaterial2 = new THREE.MeshPhongMaterial({
       		shading: THREE.FlatShading,
       	    wireframe: false,
       	    color: colorWhite,
       	    depthTest: true

       	    // map: groundTexture
       	    // emissive: 0xffffff
       	});

        //set height of vertices
	    for ( var i = 0; i<mountainGeometry2.vertices.length; i++ ) {
	         mountainGeometry2.vertices[i].z = data[i];
	    }

        mountainGeometry2.computeFaceNormals();

	    mountainMesh2 = new THREE.Mesh( mountainGeometry2, mountainMaterial2 );
	  	 

		mountainMesh2.position.y = -1600;
		mountainMesh2.position.z = -100;
	 
	 	mountainMesh2.rotation.y = Math.PI / 180 * (-5);
		mountainMesh2.rotation.x = Math.PI / 180 * (-90);
		mountainMesh2.rotation.z = Math.PI / 180 * (-25);

	    scene.add(mountainMesh2);
	};




	//GENERATING ISLAND
	islandHeightmap.onload = function () {
	  
	    //get height data from img
	    var data = getHeightData(islandHeightmap,0.15);
	  
	    // plane
	    var groundGeometry = new THREE.PlaneGeometry(900,900,31,31);
		var colorBrown = new THREE.Color("rgb(88,66,43)");
	    var groundTexture = THREE.ImageUtils.loadTexture( 'images/textures/snow.jpg' );

       	var groundMaterial = new THREE.MeshPhongMaterial({
       		shading: THREE.FlatShading,
       	    wireframe: false,
       	    color: colorBrown
       	    // map: groundTexture
       	    // emissive: 0xffffff
       	});

        //set height of vertices
	    for ( var i = 0; i<groundGeometry.vertices.length; i++ ) {
	         groundGeometry.vertices[i].z = data[i];
	    }

        groundGeometry.computeFaceNormals();

	    groundMesh = new THREE.Mesh( groundGeometry, groundMaterial );
	  
		groundMesh.receiveShadow = true;
	 
		groundMesh.rotation.x = Math.PI / 180 * (-90);
	    scene.add(groundMesh);


	    var data = getHeightData(islandHeightmap,0.18);
	  
	    // plane
	    var groundGeometry2 = new THREE.PlaneGeometry(760,760,31,31);
	    var colorWhite = new THREE.Color( 1, 1, 1 );
	    // var groundTexture = THREE.ImageUtils.loadTexture( 'images/textures/snow.jpg' );

       	var groundMaterial2 = new THREE.MeshPhongMaterial({
       		shading: THREE.FlatShading,
       	    wireframe: false,
       	    color: colorWhite
       	    // map: groundTexture
       	    // emissive: 0xffffff
       	});

        //set height of vertices
	    for ( var i = 0; i<groundGeometry2.vertices.length; i++ ) {
	         groundGeometry2.vertices[i].z = data[i];
	    }

        groundGeometry2.computeFaceNormals();

	    groundMesh2 = new THREE.Mesh( groundGeometry2, groundMaterial2 );
	  
		groundMesh2.receiveShadow = true;

		groundMesh2.position.y = 60;
		groundMesh2.position.z = -10;

	 
	 	// groundMesh2.rotation.y = Math.PI / 180 * (-2);
	 	// groundMesh2.rotation.z = Math.PI / 180 * (2);


		groundMesh2.rotation.x = Math.PI / 180 * (-90);
	    scene.add(groundMesh2);
	};


	//SEA
	seaGeometry = new THREE.PlaneGeometry(10000,10000,50,50);
	var colorBlue = new THREE.Color( "rgb(0,178,238)");
	// var seaTexture = THREE.ImageUtils.loadTexture( 'images/textures/snow.jpg' );


	var seaMaterial = new THREE.MeshPhongMaterial( { 
		wireframe: false,
		shading: THREE.FlatShading,
		color: colorBlue,
		specular: 0x0077ff, 
		shininess: 30,
		// envMap: refractionCube, 
        refractionRatio: 0.5,
        opacity: 0.7,
        // transparent: true
	} );


	for ( var i = 0; i<seaGeometry.vertices.length; i++ ) {
	     seaGeometry.vertices[i].z = Math.random() * 20 - 10;
	}

	seaGeometry.computeFaceNormals();

	seaMesh = new THREE.Mesh( seaGeometry, seaMaterial );
	
	seaMesh.receiveShadow = true;
	
	seaMesh.position.y = 100;
	seaMesh.rotation.x = Math.PI / 180 * (-90);
	scene.add(seaMesh);



	var numParticles = 20000,
		snowWidth = 4000,
		snowHeight = 5000,
		snowDepth = 4000,

		parameters = {
			color: 0xFFFFFF,
			height: 5000,
			radiusX: 10.5,
			radiusZ: 10.5,
			size: 3000,
			scale: 4.0,
			opacity: 1,
			speedH: 1.0,
			speedV: 5.0
		},

		systemGeometry = new THREE.Geometry(),
		systemMaterial = new THREE.ShaderMaterial({
			uniforms: {
				color:  { type: 'c', value: new THREE.Color( parameters.color ) },
				height: { type: 'f', value: parameters.height },
				elapsedTime: { type: 'f', value: 0 },
				radiusX: { type: 'f', value: parameters.radiusX },
				radiusZ: { type: 'f', value: parameters.radiusZ },
				size: { type: 'f', value: parameters.size },
				scale: { type: 'f', value: parameters.scale },
				opacity: { type: 'f', value: parameters.opacity },
				texture: { type: 't', value: texture },
				speedH: { type: 'f', value: parameters.speedH },
				speedV: { type: 'f', value: parameters.speedV }
			},

			vertexShader: document.getElementById( 'snow_vs' ).textContent,
			fragmentShader: document.getElementById( 'snow_fs' ).textContent,
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthTest: true
		});
	
	for( var i = 0; i < numParticles; i++ ) {
		var vertex = new THREE.Vector3(
				rand( snowWidth ),
				Math.random() * snowHeight,
				rand( snowDepth )
			);

		systemGeometry.vertices.push( vertex );
	}

	particleSystem = new THREE.PointCloud( systemGeometry, systemMaterial );
	particleSystem.position.y = -snowHeight/2;

	scene.add( particleSystem );

	clock = new THREE.Clock();

}


function animate() {

	requestAnimationFrame( animate );


	// var myo = Myo.create(0);

	// myo.on('orientation', function(rotation){
	// 
		// var quaternion = new THREE.Quaternion();
	        // quaternion.x = rotation.y;
	 // quaternion.y = rotation.z;
	 // quaternion.z = -rotation.x;
	 // quaternion.w = rotation.w;

	 // if(!window.baseRotation) {
	     // window.baseRotation = quaternion.clone();
	     // window.baseRotation = window.baseRotation.conjugate();
	 // }

	 // quaternion.multiply(baseRotation);
	 // quaternion.normalize();
	 // quaternion.x = -quaternion.x;

	        // var initialRotation = new THREE.Quaternion();
			// initialRotation.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI);
	     // 
	        // quaternion.multiply(initialRotation);

	        // camera.setRotationFromQuaternion(quaternion);
	// }) 


	// myo.on('fingers_spread', function(pose_name, edge){
	// 	// spaceShip.scale.set(1.2,1.2,1.2);
	// }) 

	// myo.on('rest', function(pose_name, edge){
	// 	spaceShip.scale.set(1,1,1);
	// }) 

	// myo.on('fist', function(pose_name, edge){
	// 	// spaceShip.scale.set(.5,.5,.5);
	// }) 

	theta = cameraAngle * Math.PI / 180;
	var x = camera.position.x;
	var z = camera.position.z;


	camera.position.x = 800*Math.cos(theta*4) + 0;
	camera.position.y = 400*Math.sin(theta*2) + 600;
 	camera.position.z = 800*Math.sin(theta*4) + 0;

	camera.lookAt( lighthouseContainer.position );



	for ( var i = 0; i<seaGeometry.vertices.length; i+=7) {
	    seaMesh.geometry.dynamic = true;
	    
	    // seaMesh.geometry.vertices[i].z =  seaMesh.geometry.vertices[i].z + sinWave;
	    var sinWave;

	    	// this controls the height

	    	seaMesh.geometry.vertices[i].z  = sinWave * i/40; 
	    	seaMesh.geometry.vertices[i+3].z = sinWave * -i/40; 

			// this controls the speed of the wave going up and down
	    	sinWave= Math.sin(gravity/30);
		 	
	    seaMesh.geometry.verticesNeedUpdate = true;
	}

	// seaMesh.geometry.computeFaceNormals();


	cameraAngle = cameraAngle + 0.05;

	if(gravity) {

		gravity++;
		time --;
		yNoise++;
	}

    // stats.end();


	var delta = clock.getDelta(),
		elapsedTime = clock.getElapsedTime();
		particleSystem.material.uniforms.elapsedTime.value = elapsedTime * 10;


    // controls.update();    

	renderer.render( scene, camera );
	stats.update();
}

function render() {

	var time = Date.now() * 0.001;

	renderer.render( scene, camera );

}

function rand( v ) {
	return (v * (Math.random() - 0.5));
}

Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

window.onresize = function() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}