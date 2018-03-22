
const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'
import MapData from './mapdata.js'
import Voronoi from './voronoi.js'
import Grid from './biocrowds.js'
var objLoader = new THREE.OBJLoader();

var gridSize = 20; // size of the plane
var gridDetail = 1; // number of samples for unit square
var smoothFactor = 5; // adjusts the smoothness of the noise
var landThreshold = 0.3; // threshold for when a vertex is on land or over water

// different types of maps to be visualized
var waterMap;
var pplMap;
var comboMap;

// voronoi for street visualization
var voronoi;

// biocrowd grid
var grid;

// biocrwod gridSize
var GRIDSIZE = gridSize;

// object to hold current gui configurations
var appConfig = function () {
    this.map = 'water';
    this.smoothFactor = smoothFactor;
    this.landThreshold = landThreshold;
    this.gridSize = gridSize;
    this.gridDetail = gridDetail;
    this.numPoints = 4;
};

var crowdsConfig = function() {
   this.scenario = "circle";
   this.AGENT_SIZE = 0.1;
   this.MORE_ROW_AGENTS = 0.4;
   this.NUM_AGENTS = 20;
   this.MARKER_DENSITY = 200;
   this.RADIUS = 0.5;
   this.CIRCLE_RADIUS = GRIDSIZE / 2;
   this.TIMESTEP = .1;
   this.markers = false;
}

var config = new appConfig();
var biocrowdsConfig = new crowdsConfig();

// called after the scene loads
function onLoad(framework) {
  var scene = framework.scene;

  // map set up and street set up
  waterMap = new MapData.WaterMap(scene, gridSize, gridDetail, 
    smoothFactor, landThreshold);
  pplMap = new MapData.PopulationMap(scene, gridSize, gridDetail, 
    smoothFactor);
  comboMap = new MapData.ComboMap(scene, gridSize, gridDetail, 
    smoothFactor, landThreshold);
  voronoi = new Voronoi.Voronoi(waterMap.points, scene, gridSize);

  waterMap.toggleDisplay(true);
  pplMap.toggleDisplay(false);
  comboMap.toggleDisplay(false);

  var camera = framework.camera;
  var renderer = framework.renderer;
  var gui = framework.gui;
  var stats = framework.stats;

  // Scene set up
  var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
  directionalLight.color.setHSL(0.1, 1, 0.95);
  directionalLight.position.set(1, 3, 2);
  directionalLight.position.multiplyScalar(10);

  scene.add(directionalLight);

  camera.position.set(0, 0, 25);
  camera.lookAt(new THREE.Vector3(0,0,0));
  camera.updateProjectionMatrix();

  // BIOCROWDS SET UP
  // Set up plane 
  grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, config, voronoi.tilesGrid);
  grid.setup();

  // Gui variables
  gui.add(camera, 'fov', 0, 180).onChange(function(newVal) {
    camera.updateProjectionMatrix();
  });

  // toggle the display for the maps according to the selected configuration
  var vis = function () {
    if (config.map == 'water') {
      waterMap.toggleDisplay(true);
      pplMap.toggleDisplay(false);
      comboMap.toggleDisplay(false);
    } else if (config.map == 'population') {
      waterMap.toggleDisplay(false);
      pplMap.toggleDisplay(true);
      comboMap.toggleDisplay(false);
    } else {
      waterMap.toggleDisplay(false);
      pplMap.toggleDisplay(false);
      comboMap.toggleDisplay(true);
    }
  }

  // update the colors of each of the planes
  var recolor = function() {
    waterMap.generateColors();
    pplMap.generateColors();
    comboMap.generateColors();
  }

  // recompute voronoi 
  var updateVoronoi = function() {
    voronoi.remove();
    voronoi = new Voronoi.Voronoi(mapBundle, config.numPoints);
  }

  // recompute the noise values according to the configurations
  var recomp = function () {
    waterMap.rewrite(config.gridSize, config.gridDetail);
    pplMap.rewrite(config.gridSize, config.gridDetail);
    comboMap.rewrite(config.gridSize, config.gridDetail);
    updateVoronoi();
    vis();
  }

  // GUI HANDLE
  gui.add(config, 'numPoints', 0, 200).onChange(function(newVal) {
    updateVoronoi();
  });

  gui.add(config, 'smoothFactor', 0, 40).onChange(function(newVal) {
    waterMap.smoothFactor = newVal;
    pplMap.smoothFactor = newVal;
    comboMap.smoothFactor = newVal;
    updateVoronoi();
    recolor();
  });

  gui.add(config, 'gridSize', 0, 100).onChange(function(newVal) {
    recomp();
  });

  gui.add(config, 'gridDetail', 0, 10).onChange(function(newVal) {
    recomp();
  });

  gui.add(config, 'landThreshold', 0.0, 1.0).onChange(function(newVal) {
    recomp();
  });

  gui.add(config, 'map', { water: 'water', 
    population: 'population', 
    combination: 'combination'}).onChange(function(value) {
    vis();
  });

  // BIOCROWD PARAMS
  gui.add(biocrowdsConfig, 'markers').onChange(function(newVal) {
      grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });

  gui.add(biocrowdsConfig, 'scenario', { Circle: 'circle', Rows: 'rows'}).onChange(function(value) {
      grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });

  gui.add(biocrowdsConfig, 'AGENT_SIZE', 0.1, 0.5).onChange(function(newVal) {
      grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });

  gui.add(biocrowdsConfig, 'MORE_ROW_AGENTS', 0, 0.4).onChange(function(newVal) {
      grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });

  gui.add(biocrowdsConfig, 'NUM_AGENTS', 0, 100).onChange(function(newVal) {
      grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });

  gui.add(biocrowdsConfig, 'MARKER_DENSITY', 0, 500).onChange(function(newVal) {
       grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });

  gui.add(biocrowdsConfig, 'RADIUS', 0.0, 10).onChange(function(newVal) {
      grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });

  gui.add(biocrowdsConfig, 'CIRCLE_RADIUS', 0, 10).onChange(function(newVal) {
      grid.clearScene();
      grid = new Grid.Grid(scene, GRIDSIZE, GRIDSIZE, biocrowdsConfig, voronoi.tilesGrid);
      grid.setup();
  });
}

// called on frame updates
function onUpdate(framework) {
  if (!(grid === undefined)) {
    grid.tick();
  }
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
