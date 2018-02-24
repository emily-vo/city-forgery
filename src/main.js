
const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
const VORONOI = require('voronoi')
import Framework from './framework'
import MapData from './mapdata.js'
import Voronoi from './voronoi.js'
import Delauney from './delauney.js'
import SimpleVoronoi from './simplevoronoi.js'
var objLoader = new THREE.OBJLoader();

var gridSize = 10;
var gridDetail = 1; // number of samples for unit square
var smoothFactor = 5;
var landThreshold = 0.3;


var waterMap;
var pplMap;
var comboMap;

var appConfig = function () {
    this.map = 'water';
    this.smoothFactor = smoothFactor;
    this.landThreshold = landThreshold;
    this.gridSize = gridSize;
    this.gridDetail = gridDetail;
    this.numPoints = 4;
};
var MapBundle = function () {
    this.water;
    this.pop;
    this.scene;
    this.gridSize;
}

var config = new appConfig();
var mapBundle = new MapBundle();
// called after the scene loads
function onLoad(framework) {
  var scene = framework.scene;
  waterMap = new MapData.WaterMap(scene, gridSize, gridDetail, smoothFactor, landThreshold);
  pplMap = new MapData.PopulationMap(scene, gridSize, gridDetail, smoothFactor);
  comboMap = new MapData.ComboMap(scene, gridSize, gridDetail, smoothFactor, landThreshold);
  waterMap.toggleDisplay(true);
  pplMap.toggleDisplay(false);
  comboMap.toggleDisplay(false);

  mapBundle.water = waterMap;
  mapBundle.pop = pplMap;
  mapBundle.scene = scene;
  mapBundle.gridSize = gridSize;

  //var triangulation = new Delauney.Delauney(waterMap.points, scene);
  //triangulation.draw(scene);
  //triangulation.drawFlip(scene);

  var voronoi = new SimpleVoronoi.SimpleVoronoi(waterMap.points, scene);
  //var voronoi = new Voronoi();
  var bbox = {xl: 0, xr: 800, yt: 0, yb: 600}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom 
  var sites = [ {x: 200, y: 200}, {x: 50, y: 250}, {x: 400, y: 100} /* , ... */ ]
  //var diagram = voronoi.compute(sites, bbox);
  // console.log(diagram)
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
    mapBundle.gridSize = newVal;
  });

  gui.add(config, 'gridDetail', 0, 10).onChange(function(newVal) {
    recomp();
  });

  gui.add(config, 'landThreshold', 0.0, 1.0).onChange(function(newVal) {
    recomp();
  });


  gui.add(config, 'map', { water: 'water', population: 'population', combination: 'combination'}).onChange(function(value) {
    vis();
  });

  
}


// called on frame updates
function onUpdate(framework) {
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
