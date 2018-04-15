
require('file-loader?name=[name].[ext]!../index.html');
const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE)
const OBJLoader = require('three-obj-loader')(THREE)

import Stats from 'stats-js'
import DAT from 'dat-gui'

import {setupGUI} from './setup'

import MapData from './mapdata.js'
import Voronoi from './voronoi.js'
import Grid from './biocrowds.js'
import Building from './building.js'

// global timer for shader updates
var clock = new THREE.Clock(false);
clock.start();

// size of the city plane
var gridSize = 10; 
var gridDetail = 1;

// voronoi for street visualization
var voronoi;

// biocrowd grid
var grid;

// all buildings in the city
var buildings = [];

// GUI control parameters 
var appConfig = function() {
   this.SCENARIO = "circle";
   this.NUM_ROW_AGENTS = 1;
   this.NUM_CIRCLE_AGENTS = 20;
   this.MARKER_DENSITY = 256;
   this.RADIUS = 0.2;
   this.CIRCLE_RADIUS = gridSize / 2;
   this.TIMESTEP = .1;
   this.SHOW_VORONOI = false;
   this.PLAYING = true;
   this.FLASHING = false;
}

var config = new appConfig();
var buildings = [];

// called after the scene loads
window.addEventListener('load', function() {
  /*
   * WINDOW AND SCENE SET UP
   */
  // set up the stats gui bar
  var stats = new Stats();
  stats.setMode(1);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);
  
  // set up the gui and its framework
  var gui = new DAT.GUI();
  var framework = {
    gui: gui,
    stats: stats
  };

  // scene, camera, and renderer initialization
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  var renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1.0);
  document.body.appendChild(renderer.domElement);

  // restrict camera movement for user
  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableKeys = true;
  controls.rotateSpeed = 0.3;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 2.0;
  controls.maxAzimuthAngle = Math.PI / 3;
  controls.minAzimuthAngle = -Math.PI / 3;
  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI;

  // light and camera set up
  var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
  directionalLight.color.setHSL(0.1, 1, 0.95);
  directionalLight.position.set(1, 3, 2);
  directionalLight.position.multiplyScalar(10);

  scene.add(directionalLight.clone());
  directionalLight.position.set(1, -3, -2);
  scene.add(directionalLight.clone());
  camera.position.set(0, 0, 25);
  camera.lookAt(new THREE.Vector3(0,0,0));
  camera.updateProjectionMatrix();

  /*
   * STREET SET UP (VORONOI DIAGRAM)
   */
  var map = new MapData.WaterMap(scene, gridSize, gridDetail, 12, 0.3);
  var points = map.generateVoronoiSites();
  voronoi = new Voronoi.Voronoi(points, scene, gridSize);

  /*
   * BIOCROWDS SET UP
   */
  // write the voronoi data to the plane, which is then passed to the biocrowds grid
  grid = new Grid.Grid(scene, gridSize, gridSize, config, voronoi.tilesGrid);
  var voronoiPlane = grid.writeVoronoi(config.MARKER_DENSITY);
  voronoiPlane.position.z = 0;
  grid.plane = voronoiPlane;
  if (config.SHOW_VORONOI) scene.add(voronoiPlane);
  grid.setup();
  
  /*
   * BUILDING SET UP
   */
  // param determines number of buildings per unit square
  var buildingSpawnDetail = 2; 

  // set up plane mesh for testing
  var planeGeo = new THREE.PlaneGeometry(gridSize, gridSize, 
    buildingSpawnDetail * gridSize, buildingSpawnDetail * gridSize);
  var planeMat = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      wireframe: false });
  var planeMesh = new THREE.Mesh(planeGeo, planeMat);
  scene.add(planeMesh);

  // load the three textures for the buildings
  var texloader = new THREE.TextureLoader();
  var pink = texloader.load('./src/assets/iridescent.bmp');
  var green = texloader.load('./src/assets/bluegreen.bmp');
  var sunset = texloader.load('./src/assets/sunset.bmp');

  // for each vertex, generate a building only if it is within a proper voronoi region.
 for (var i = 0; i < planeMesh.geometry.vertices.length; i++) {
    var v = planeMesh.geometry.vertices[i];
    if (grid.inSmallerCellPixelTest(v)) {
      // randomly choose a texture for each building
      var texture = Math.random() < 0.5 ? sunset : green;
      var texture = Math.random() < 0.5 ? texture : pink;
      var building = new Building.Building(scene, v, clock, camera, texture);
      buildings.push(building);
    }; 
  }
  planeMesh.position.set(0, 0, -0.02);
  planeMesh.scale.set(50, 50, 0);
  /*
   * GUI SET UP
   */
  function resetGrid() {
    grid.clearScene();

    grid = new Grid.Grid(scene, gridSize, gridSize, 
      config, voronoi.tilesGrid);
    
    grid.plane = voronoiPlane;

    if (config.SHOW_VORONOI) scene.add(voronoiPlane);
    
    grid.setup();
  }

  gui.add(camera, 'fov', 0, 180).onChange(resetGrid);

  gui.add(config, 'SCENARIO', 
    { Circle: 'circle', Rows: 'rows'}).onChange(resetGrid);

  gui.add(config, 'NUM_ROW_AGENTS', 
    1, 100).onChange(resetGrid);

  gui.add(config, 'NUM_CIRCLE_AGENTS', 
    0, 300).onChange(resetGrid);

  gui.add(config, 'MARKER_DENSITY', 
    256, 512).onChange(function (val) {
      grid.clearScene();
      grid = new Grid.Grid(scene, gridSize, gridSize, config, voronoi.tilesGrid);
      voronoiPlane = grid.writeVoronoi(config.MARKER_DENSITY);
      voronoiPlane.position.z = 0;
      grid.plane = voronoiPlane;
      if (config.SHOW_VORONOI) scene.add(voronoiPlane);
      grid.setup();
    });

  gui.add(config, 'SHOW_VORONOI').onChange(function (val) {
    if (val) {
      scene.add(voronoiPlane);
    } else {
      scene.remove(voronoiPlane);
    }
  });

  gui.add(config, 'RADIUS', 0.0, 10).onChange(resetGrid);

  gui.add(config, 'CIRCLE_RADIUS', 0, 10).onChange(resetGrid);

  gui.add(config, 'TIMESTEP', 0, 10).onChange(resetGrid);

  gui.add(config, 'PLAYING').onChange(function (val) {

  });

  window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  /*
   * POST PROCESS SHADER SET UP AND GUI SET UP
   */  
  var mesh, shader, post;
  // this gets called when we set the shader
  function shaderSet(Shader, gui) {
  }

  // this gets called when we set the postprocess shader
  function postProcessSet(Post, gui) {
      // create the shader and initialize its gui
      post = new Post(renderer, scene, camera);
      post.initGUI(gui);
  }

  setupGUI(shaderSet, postProcessSet);

  (function tick() {
    if (clock) clock.getDelta();
    if (!(grid === undefined) && config.PLAYING) {
      grid.tick();
    }
  
    buildings.forEach(function(b) {
        b.tick();
    });

    stats.begin();

    if (shader && shader.update) shader.update();   // perform any necessary updates
    if (post && post.update) post.update();         // perform any necessary updates
    if (post) post.render();                        // render the scene
    
    stats.end();
    requestAnimationFrame(tick);

  })();
});
