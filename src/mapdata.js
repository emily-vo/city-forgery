const THREE = require('three');
import Noise from './noise.js'

// IQ Color Pallete Helper Function
var a = new THREE.Vector3(0.5, 0.5, 0.5);
var b = new THREE.Vector3(0.5, 0.500, 0.500);
var c = new THREE.Vector3(1, 1, 1);
var d = new THREE.Vector3(0.000, 0.333, 0.667);

function palleteColor(a, b, c, t, d) {
	c.multiplyScalar(t);
	c.add(d);
	c.multiplyScalar(6.28318);
	c.x = Math.cos(c.x);
	c.y = Math.cos(c.y);
	c.z = Math.cos(c.z);
	c.multiply(b);
	c.add(a);
	return new THREE.Color(c.x, c.y, c.z);
}

class Map {
	// creates the mesh and colors the mesh according to the map type 
	constructor(scene, gridSize, gridDetail, smoothFactor, visualizationScheme, landThreshold) {
		var planeGeo = new THREE.PlaneGeometry(gridSize, gridSize, 
		gridDetail * gridSize, gridDetail * gridSize);
		var planeMat = new THREE.MeshBasicMaterial({wireframe: true, color: 0x000000, vertexColors: THREE.VertexColors, side: THREE.DoubleSide });
		this.mesh = new THREE.Mesh(planeGeo, planeMat);
		this.geo = planeGeo;
		this.scene = scene;
		this.visualizationScheme = visualizationScheme;
		this.landThreshold = landThreshold;
		this.smoothFactor =smoothFactor;
		this.gridSize = gridSize;

		//this.mesh.rotateX((90 * Math.PI)/180);
		this.normalizeVertices();
		//this.scene.add(this.mesh);
		this.points;
		this.generateVoronoiSites();
		
		//this.generateColors();
	}

	generateVoronoiSites() {
	var testPoints = [];
	var random = function (a, b, c) {
		var x = new THREE.Vector3(a, b, c);
		var y = new THREE.Vector3(123.4031, 46.5244876, 91.106168);
		var i = x.dot(y);
		var value = Math.sin(i * 7.13) * 268573.103291;
		return value - Math.floor(value);
	}
	for (var i = 0; i < this.mesh.geometry.vertices.length; i++) {
		var v = this.mesh.geometry.vertices[i];
		var x = v.x + 0.5 * random(v.x, v.y, v.z) + 0.25;
		var y = v.y + 0.5 * random(v.x, v.y, v.z) + 0.25;
		x = v.x + Math.random();
		y = v.y + Math.random();
		//console.log(x);
		//console.log(y)
		if (v.x < this.gridSize / 2 && y < this.gridSize / 2) {
			testPoints.push(new THREE.Vector3(x, y, 0));
		}
	}
	this.points = testPoints;
	}

	normalizeVertices() {
		for (var i = 0; i < this.geo.vertices; i++) {
			var vert = this.geo.vertices[i];
			var x = Math.floor(vert.x);
			var y = Math.floor(vert.y);
			var z = Math.floor(vert.z);
			this.geo.vertices[i] = new THREE.Vector3(x, y, z);
		}
	}

	// iterates over the faces and changes the colors according to a noise function
	generateColors() {
		for (var i = 0; i < this.geo.faces.length; i++) {
			//var color = new THREE.Color(0xff0000);
			var face = this.geo.faces[i];
			

			var char = ['a', 'b', 'c'];
			for (var j = 0; j < char.length; j++) {
				var idx = face[char[j]];
				var vert = this.geo.vertices[idx];
				var t = this.t(vert);
				var color = this.visualizationScheme(t);
				//if (i == 0 && j == 0) console.log(t);
				//
				if (face.vertexColors[j]) {
					face.vertexColors[j].setRGB(color.r, color.g, color.b);
				}
				else {
					face.vertexColors[j] = color;
				}
				
				//if (i == 0 && j == 0) console.log(face.vertexColors[j]);
			}
		}

		this.mesh.geometry.colorsNeedUpdate = true;
	}

	t(vert) {
		return Noise.ThreeDNoise(vert.x / this.smoothFactor, vert.y / this.smoothFactor, vert.z / this.smoothFactor);
	}

	toggleDisplay(show) {
		if (show) {
			this.scene.add(this.mesh);
		} else {
			this.scene.remove(this.mesh);
		}
	}

	rewrite(gridSize, gridDetail) {
		this.scene.remove(this.mesh);
		var planeGeo = new THREE.PlaneGeometry(gridSize, gridSize, 
		gridDetail * gridSize, gridDetail * gridSize);
		var planeMat = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors, side: THREE.DoubleSide, wireframe: false });
		this.mesh = new THREE.Mesh(planeGeo, planeMat);
		this.geo = planeGeo;
		this.normalizeVertices();
		this.generateColors();
		this.mesh.rotateX((90 * Math.PI)/180);
		this.scene.add(this.mesh);
	}
}

class WaterMap extends Map {
	constructor(scene, gridSize, gridDetail, smoothFactor, landThreshold) {
		var visualizationScheme = function (t) {
			return t > this.landThreshold ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0);
		};

		super(scene, gridSize, gridDetail, smoothFactor, visualizationScheme, landThreshold);
	}
	onLand(vert) {
		return this.t(vert) > this.landThreshold;
	}
}

class PopulationMap extends Map {
	constructor(scene, gridSize, gridDetail, smoothFactor) {
		var visualizationScheme = function (t) {
			var dt = 1.5 * t;
			var color = new THREE.Color();
			color.setHSL(dt, dt, dt);
			return color;
		};

		super(scene, gridSize, gridDetail, smoothFactor, visualizationScheme);
	}
}

class ComboMap extends Map {
	constructor(scene, gridSize, gridDetail, smoothFactor, landThreshold) {
		var visualizationScheme = function (t) {
			var dt = 1.5 * t;
			var color = new THREE.Color();
			color.setHSL(dt, dt, dt);
			return t > this.landThreshold ? color : new THREE.Color(0, 0, 0);
		};

		super(scene, gridSize, gridDetail, smoothFactor, visualizationScheme, landThreshold);
	}
	onLand(vert) {
		return this.t(vert) > this.landThreshold;
	}
}

export default {
	Map: Map,
	WaterMap: WaterMap,
	PopulationMap: PopulationMap,
	ComboMap: ComboMap
}