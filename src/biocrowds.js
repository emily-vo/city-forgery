const THREE = require('three'); 
import Voronoi from './voronoi.js'
const SHUTTERSPEED = 50;
class Agent {
	constructor() {
		this.mesh; 
		this.vel;
		this.goal;
		this.orientation;
		this.size = 0.25;
		this.markers = [];
		this.color;
		this.delta = 0.0;
		this.its = 0;
		this.uniforms = {
		  shutterSpeed: {type: "f", value: SHUTTERSPEED},
		  velocities: {type: "v3", value: new THREE.Vector3()},
		  boundingBoxMin: {type: "v3", value: new THREE.Vector3()}, 
		  boundingBoxMax: {type: "v3", value: new THREE.Vector3()}}
		}
}

class Marker {
	constructor() {
		this.contribution;
		this.position;
		this.pixel;
		this.agent;
	}
}

class Grid {
	constructor(scene, width, height, options, tileGrid) {
		this.AGENT_SIZE = options.AGENT_SIZE;
		this.MORE_ROW_AGENTS = 1 / options.MORE_ROW_AGENTS;
		this.NUM_CIRCLE_AGENTS = options.NUM_CIRCLE_AGENTS;
		this.MARKER_DENSITY = options.MARKER_DENSITY;
		this.RADIUS = options.RADIUS;
		this.CIRCLE_RADIUS = options.CIRCLE_RADIUS;
		this.TIMESTEP = options.TIMESTEP;
		this.SHOW_MARKERS = options.markers;
		//this.gridSet = options.gridSet;
		this.textureWidth = 256;
    	this.textureHeight = 256;
		this.options = options;
		this.scene = scene;
		this.w = width;
		this.h = height;
		this.markerMesh;
		this.agents = [];
		this.colorsToAgents = {};
		this.markers = [];
		this.scenario = options.scenario;
		this.table = [];
		this.colors = [];
		this.tileGrid = tileGrid;
		this.plane;
		this.pixelRadius = Math.floor((this.RADIUS / (2 * this.w)) * this.textureWidth) * 2;
		// Location mapped to list of agents within cells
		for (var x = 0; x < this.w; x++) {
			var arr = [];
			for (var y = 0; y < this.h; y++) {
				arr[y] = [];
			}
			this.table[x] = arr;
		}

		
	}

	clearScene() {
		if (!(this.plane === undefined)) {
			this.scene.remove(this.plane);
		}
		if (!(this.markerMesh === undefined) && this.SHOW_MARKERS) {
			this.scene.remove(this.markerMesh);
		}
		if (!(this.agents === undefined)) {
			for (var i = 0; i < this.agents.length; i++) {
				this.scene.remove(this.agents[i].mesh);
			}
		}
	}

	index(x, y) {
		return 3 * (y * this.textureWidth + x);
	}

	getPixel(pos) {
		var x = (pos.x + this.w / 2) / this.w;
		var y = (pos.y + this.h / 2) / this.h; 
		return new THREE.Vector2(Math.floor(x * this.textureWidth), Math.floor(y * this.textureHeight));
	}

	getPos(x, y) {
		var a = x / this.textureWidth;
		a *= this.w;
		a -= this.w / 2;
		var b = y / this.textureHeight;
		b *= this.h;
		b -= this.h / 2;
		return new THREE.Vector3(a, b, 0);
	}

	getPixelCoordinates(index) {
		var idx = index / 3;
		var y = Math.floor(idx / this.textureHeight);
		var x = idx % this.textureWidth;
		return new THREE.Vector2(x, y);
	}

	writeVoronoi(width) {
		var height = width;
		var planeGeo = new THREE.PlaneGeometry(this.w, this.h, this.w, this.h);
		var size = width * height;
	    var data = new Uint8Array(3 * size);
		for (var i = 0; i < size; i++) {
			var stride = i * 3;
			data[stride] = 0;
			data[stride + 1] = 0;
			data[stride + 2] = 0;

			var px = this.getPixelCoordinates(stride);
			var pos = this.getPos(px.x, px.y);
			// find grid cell that pos is in
			var gridX = Math.floor(pos.x);
			var gridY = Math.floor(pos.y);

			var cells = this.getClosestVoronoiCells(gridX, gridY);
			for (var m = 0; m < cells.length; m++) {
        		if (this.pointInPolygon(pos, cells[m])) {
        			if (this.pointInSmallerPolygon(pos, cells[m])) { // if inside the inner poly, make red
        				data[stride] = 255;
						data[stride + 1] = 0;
						data[stride + 2] = 0;
	        			break;
        			} else { // if only inside the outer poly, make it white
        				data[stride] = 255;
						data[stride + 1] = 255;
						data[stride + 2] = 255;
	        			break;
        			}
        		}
            }
		}

		
		var texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
		var planeMat = new THREE.MeshBasicMaterial({map : texture});
    	var plane = new THREE.Mesh( planeGeo, planeMat );
    	plane.position.z -= 0.1;
    	plane.material.map = texture;
    	plane.geometry.verticesNeedUpdate = true;
		plane.geometry.dynamic = true;

		plane.material.map.needsUpdate = true;
		plane.material.needsUpdate = true;

    	return plane;
	}

	setup() {
		console.log("Setting up...");
		console.log("Scenario: " + this.scenario);
    	this.initAgents();	
	}

	

	/*
	 * Init agent position based on chosen scenario.
	 */
	initAgents() {
		if (this.scenario == "rows") {
			this.initRows();
		}
		else if (this.scenario == "circle") {
			this.initCircle();
		}
	}

	/*
	 * Create two rows scenario, and then have agents cross the other side of the plane
	 */
	initRows() {
		// Create front row
		for (var i = -this.w / 2; i < this.w / 2; 
			i += this.MORE_ROW_AGENTS * this.AGENT_SIZE) {
			var agent = new Agent();
			agent.size = this.AGENT_SIZE;
			
			var color = new THREE.Color().setRGB(Math.random(), Math.random(), Math.random());
			agent.color = color;
			var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
			var mesh = new THREE.Mesh(
			    new THREE.IcosahedronGeometry(0.025, 1),
			    material
		  	);
		  	var colorId = new THREE.Vector3(Math.floor(color.r * 255), Math.floor(color.g * 255), Math.floor(color.b * 255));
			var idStr = this.colorToId(colorId);
			this.colorsToAgents[idStr] = agent;
			agent.mesh = mesh;
			agent.mesh.position.set(i, -this.w / 2 + 1, 0);
			agent.goal = new THREE.Vector3(-i, this.w / 2 - 1, 0);
			// Add to scene and store agent
			this.scene.add(agent.mesh);
			this.agents.push(agent);
		}

		// Create back row
		for (var i = -this.w / 2; i < this.w / 2; 
			i += this.MORE_ROW_AGENTS*this.AGENT_SIZE) {
			var agent = new Agent();
			agent.size = this.AGENT_SIZE;
			
			var color = new THREE.Color().setRGB(Math.random(), Math.random(), Math.random());
			agent.color = color;
			var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
			var mesh = new THREE.Mesh(
			    new THREE.IcosahedronGeometry(0.025, 1),
			    material
		  	);
		  	var colorId = new THREE.Vector3(Math.floor(color.r * 255), Math.floor(color.g * 255), Math.floor(color.b * 255));
			var idStr = this.colorToId(colorId);
			this.colorsToAgents[idStr] = agent;
			agent.mesh = mesh;
			agent.mesh.position.set(i, this.w / 2 - 1, 0);
			agent.goal = new THREE.Vector3(-i, -this.w / 2 + 1, 0);
			// Add to scene and store agent in table
			this.scene.add(agent.mesh);
			this.agents.push(agent);
		}
	}

	/* 
	 * Create a circular scenario.
	 */
	getAgent(color) {
		return this.colorsToAgents[new THREE.Vector3(Math.floor(color.r * 255), Math.floor(color.g * 255), Math.floor(color.b * 255))];
	}
	colorToId(color) {
		return "" + color.x + "" + color.y + "" + color.z
	}
	initCircle() {
		var t = 0;
		for (var i = 0; i < this.NUM_CIRCLE_AGENTS; i++) {
			var agent = new Agent();
			agent.size = this.AGENT_SIZE;
			
			var color = new THREE.Color().setRGB(Math.random(), Math.random(), Math.random());
			agent.color = color;
			var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
			var mesh = new THREE.Mesh(
			    new THREE.IcosahedronGeometry(0.025, 1),
			    material
		  	);
		  	var colorId = new THREE.Vector3(Math.floor(color.r * 255), Math.floor(color.g * 255), Math.floor(color.b * 255));
			var idStr = this.colorToId(colorId);
			this.colorsToAgents[idStr] = agent;
		  	agent.mesh = mesh;

			var x = this.CIRCLE_RADIUS * Math.sin(t);
			var y = this.CIRCLE_RADIUS * Math.cos(t);
			var z = agent.size / 2;
			agent.mesh.position.set(x, y, z);

			mesh.geometry.computeBoundingBox();
			agent.uniforms.boundingBoxMin.value = mesh.geometry.boundingBox.min;
			agent.uniforms.boundingBoxMax.value = mesh.geometry.boundingBox.max;
			// Add to scene and store agent in table
			this.scene.add(agent.mesh);
			this.agents.push(agent);

			// Set up goal to be half a circle away
			agent.goal = new THREE.Vector3(this.CIRCLE_RADIUS * Math.sin(t + Math.PI), 
				this.CIRCLE_RADIUS * Math.cos(t + Math.PI), 
				0);

			t += 2 * Math.PI / this.NUM_CIRCLE_AGENTS;
		}
		
	}

	inCellPixelTest(v) {
		var p = this.getPixel(v);
		var idx = this.index(p.x, p.y);
		var texture = this.plane.material.map;
		var data = texture.image.data;
		//console.log(data)
		//console.log(idx < data.length)
		var r = data[idx];
		var g = data[idx + 1];
		var b = data[idx + 2];
		return r == 255 && g == 255 && b == 255;
	}

	inSmallerCellPixelTest(v) {
		var p = this.getPixel(v);
		var idx = this.index(p.x, p.y);
		var texture = this.plane.material.map;
		var data = texture.image.data;
		//console.log(data)
		//console.log(idx < data.length)
		var r = data[idx];
		var g = data[idx + 1];
		var b = data[idx + 2];
		return r == 255 && g == 0 && b == 0;
	}

	inCellGeoTest(pos) {
		var gridX = Math.floor(pos.x);
		var gridY = Math.floor(pos.y);

		var cells = this.getClosestVoronoiCells(gridX, gridY);
		for (var m = 0; m < cells.length; m++) {
    		if (this.pointInPolygon(pos, cells[m])) {
    			return true;
    		}
        }
        return false;
	}

	getClosestVoronoiCells(x, y) {
		var closeTiles = [];
    	//console.log(this.tileGrid[x])
    	for (var k = -1; k <= 1; k++) {
    		for (var l = -1; l <= 1; l++) {

    			if (this.tileGrid[x + k] !== undefined) {
    				//console.log(this.tileGrid[x + k])
    				if (this.tileGrid[x + k][y + l] !== undefined) {
    					closeTiles.push(this.tileGrid[x + k][y + l]);
    				}
    			}
    			
    		}
    	}
    	return closeTiles;
	}
	scatterPoints() {
		console.log("Scattering points...");
		var dotGeometry = new THREE.Geometry();

		for (var j = 0; j < this.MARKER_DENSITY; j++) {
			for (var i = 0; i < this.plane.geometry.vertices.length; i++) {
				// don't worry about edge cases
				if (this.plane.geometry.vertices[i].x == this.w / 2 || 
					this.plane.geometry.vertices[i].y == this.h / 2) {
					continue;
				}
				// Normalize floor grid vertices
				var geo = this.plane.geometry;
				var vert = geo.vertices[i];
				geo.vertices[i] = vert.floor();
	
				// Sample the position
				var x = Math.floor(this.plane.geometry.vertices[i].x);
				var y = Math.floor(this.plane.geometry.vertices[i].y);
				var x1 = x + Math.random();
            	var y1 = y + Math.random();

            	// check grid surrounding this marker pos
            	var closeTiles = this.getClosestVoronoiCells(x, y);

            	var markerPos = new THREE.Vector3(x1, y1, 0 );

            	var invalid = false;
            	for (var m = 0; m < closeTiles.length; m++) {
            		if (this.pointInPolygon(markerPos, closeTiles[m])) {
            			invalid = true;
            			break;
            		}
            	}
				
				if (!invalid) {
					var marker = new Marker();
					marker.position = markerPos;
					

					// Map the vertex to its grid
					this.table[x + this.w / 2][y + this.h / 2].push(marker);
					this.markers.push(marker);
					marker.colorIndex = this.markers.length - 1;

	            	// Determine a color
	            	var color = new THREE.Color();
	    			color.setRGB(1, 1, 1);
					this.colors.push(color);

	            	// Push the marker mesh to the geometry
					dotGeometry.vertices.push(markerPos);
				}
				
			}	
		}
		

		// Add markers to the scene
		dotGeometry.colors = this.colors;
        var dotMaterial = new THREE.PointsMaterial( {size: 0.05, 
        	vertexColors: THREE.VertexColors} );
        this.markerMesh = new THREE.Points( dotGeometry, dotMaterial );   
        if (this.SHOW_MARKERS) {
        	this.scene.add( this.markerMesh );
        }
	}

	/*
	 * if a line to infinity from the point intersects with the 
	 * polygon an odd number of times, it is inside the polygon.
	 */
	pointInPolygon(v, polygon) {
		// create point to infinity
		var count = 0;
		var inf = new THREE.Vector3(10000.0, 10000.0, 0);
		//console.log(polygon.edges.length)
		polygon.edges.forEach(function (edge) {
			if (this.intersectionTest(v, inf, edge.a, edge.b) !== undefined) {
				count++;
			}
		}, this);
		//console.log(count)
		return count % 2 != 0;
	}

	pointInSmallerPolygon(v, polygon) {
		// create point to infinity
		var count = 0;
		var inf = new THREE.Vector3(10000.0, 10000.0, 0);
		//console.log(polygon.edges.length)
		polygon.innerEdges.forEach(function (edge) {
			if (this.intersectionTest(v, inf, edge.a, edge.b) !== undefined) {
				count++;
			}
		}, this);
		//console.log(count)
		return count % 2 != 0;
	}

	/*
	 * using the endpoints for an edge e and an edge o, get the point of intersection
	 * important: returns undefined if there is no intersection
	 */
	intersectionTest(e0, e1, o0, o1) {
		// convert to Ax + By = C form
		var A1 = e1.y - e0.y;
		var B1 = e0.x - e1.x;
		var C1 = A1 * e0.x + B1 * e0.y;
		
		var A2 = o1.y - o0.y;
		var B2 = o0.x - o1.x;
		var C2 = A2 * o0.x + B2 * o0.y;

		var det = A1 * B2 - A2 * B1;

		// parallel lines
		if (Math.abs(det) < 0.001) {
			return undefined;
		} else { 
			var x = (B2 * C1 - B1 * C2) / det;
			var y = (A1 * C2 - A2 * C1) / det;
			// check if x and y are within the bounds
			var intersection = new THREE.Vector3(x, y, 0);
			if (this.inBounds(intersection, e0, e1) && this.inBounds(intersection, o0, o1)) {
				return intersection;
			}
			
		}
	}

	inBounds(point, p1, p2) {
		var x = point.x;
        var y = point.y;
        var  onLine = x >= Math.min(p1.x, p2.x) && x <= Math.max(p1.x, p2.x)
               && y >= Math.min(p1.y, p2.y) && y <= Math.max(p1.y, p2.y);
        return onLine;
	}

	tick() {
		// Assigns markers based on the closest
		this.resetMarkerOwnership();
		for (var i = 0; i < this.agents.length; i++) {
			var agent = this.agents[i];
			var gridMarkers = this.getMarkers(agent.mesh.position);
			this.assignMarkers(agent, gridMarkers);
		}

		for (var i = 0; i < this.agents.length; i++) {
			var agent = this.agents[i];
			this.updateVelocity(agent);
			this.updatePosition(agent);
		}
	}

	updateVelocity(agent) {
		agent.vel = new THREE.Vector3(0, 0, 0);
		var totalContribution = 0.0;
		var x = agent.mesh.position;
		var g = new THREE.Vector3().subVectors(x, agent.goal);
		for (var i = 0; i < agent.markers.length; i++) {
			var a = agent.markers[i].position;
			var m = new THREE.Vector3().subVectors(x, a);
			agent.markers[i].contribution = 
			(1 + m.dot(g) / 
				(m.length() * g.length())) / (1 + m.length());
			totalContribution += agent.markers[i].contribution;
		}

		for (var i = 0; i < agent.markers.length; i++) {
			var a = agent.markers[i].position;
			var m = new THREE.Vector3().subVectors(a, x);
			agent.vel.add(m.multiplyScalar(agent.markers[i].contribution / totalContribution));
			agent.markers[i].contribution = 0;
		}

		if (agent.vel.length() > this.RADIUS) {
			agent.vel.normalize().multiplyScalar(this.RADIUS);
		}
		agent.markers = agent.markers.filter(function (marker) {
			return false;
		});

		agent.uniforms.velocities.value = agent.vel.clone().multiplyScalar(-0.1);
	}

	updatePosition(agent) {
		var prev = agent.mesh.position;
		agent.mesh.position.add(agent.vel.multiplyScalar(this.TIMESTEP));
		
		agent.delta += prev.distanceTo(agent.mesh.position);
		agent.its++;
		// if after a certain number of iterations, the agent hasn't progressed much, change the goal
		if (agent.its > 50 + 400 * Math.random()) {
			if (agent.delta < 0.0001) {
				agent.goal = new THREE.Vector3(Math.random() * this.w - this.w / 2,
					Math.random() * this.w - this.w / 2,
					Math.random() * this.w - this.w / 2);
			}
			agent.delta = 0.0;
			agent.its = 0;
		}
	}

	distToSegment(p1, p2, point) {
		return Math.abs((p2.y - p1.y) * point.x - 
			(p2.x - p1.x) * point.y + 
			p2.x * p1.y - 
			p2.y * p1.x) / p1.distanceTo(p2);
	}

	assignMarkers(agent, gridMarkers) {
		if (this.plane !== undefined) {
		for (var j = 0; j < gridMarkers.length; j++) {
			// distance to this agent
			var currDistance = (new THREE.Vector3().subVectors(gridMarkers[j].position, 
				agent.mesh.position)).length();
			var unassigned = false;
			var closer = false;
			if (currDistance < this.RADIUS) {
				var marker = gridMarkers[j];
				// Already assigned closest marker
				// check pixel data to see if its white / unassigned
				var idx = this.index(marker.pixel.x, marker.pixel.y);
				//console.log(idx < data.length)
				var texture = this.plane.material.map;
				var data = texture.image.data;
				//console.log(data)
				//console.log(idx < data.length)
				var r = data[idx];
				var g = data[idx + 1];
				var b = data[idx + 2];
				// var r = data[idx];
				// var g = data[idx + 1];
				// var b = data[idx + 2];
				if (idx > data.length)
					continue;
				if (r == 0 && g == 0 && b == 0) {
					// Update pixel color
					// save the color as an id, map the color to the agent
					
					data[idx] = Math.floor(agent.color.r * 255);
					data[idx + 1] = Math.floor(agent.color.g * 255);
					data[idx + 2] = Math.floor(agent.color.b * 255);
					// data[idx] = Math.floor(agent.color.r * 255);
					// data[idx + 1] = Math.floor(agent.color.g * 255);
					// data[idx + 2] = Math.floor(agent.color.b * 255);
					agent.markers.push(marker)
				} else {
					var color = new THREE.Vector3(r, g, b);
					var strIdx = this.colorToId(color);

					// // find some way to retrieve the agents 
					var markerAgent = this.colorsToAgents[strIdx];
					//debugger;
					//console.log(markerAgent)
					 var closest = (new THREE.Vector3().subVectors(marker.position, 
					 	markerAgent.mesh.position, agent.mesh.position)).length();
					 //console.log(markerAgent.mesh)
					closer = currDistance < closest;
					if (closer) {
						//console.log(markerAgent.markers.length)
						// markerAgent.markers = markerAgent.markers.filter(function (m) {
						// 	// this is not equal to the pixel 
						// 	return m.pixel.x != marker.pixel.x && m.pixel.y != marker.pixel.y
						// }, this);
						//console.log(markerAgent.markers.length)

						// Assign new agent
						agent.markers.push(marker);		
						// Update color
						var texture = this.plane.material.map;
						var data = texture.image.data;
						// data[idx] = Math.floor(agent.color.r * 255);
						// data[idx + 1] = Math.floor(agent.color.g * 255);
						// data[idx + 2] = Math.floor(agent.color.b * 255);
						data[idx] = Math.floor(agent.color.r * 255);
						data[idx + 1] = Math.floor(agent.color.g * 255);
						data[idx + 2] = Math.floor(agent.color.b * 255);
					}
				}
			}
			
		}
		//var newTexture = new THREE.DataTexture(data, this.textureWidth, this.textureHeight, THREE.RGBFormat);
    	//this.plane.material.map = newTexture;
		this.plane.material.map.needsUpdate = true;
		this.plane.material.needsUpdate = true;
	}
	}

	// We're only interested in markers in the surrounding grid
	getMarkers(agentPos) {
		// create markers of 50 pixel width

		//var x = Math.floor(agentPos.x) + this.w / 2;
		//var z = Math.floor(agentPos.y) + this.h / 2;
		var markers = [];
		var agentPixel = this.getPixel(agentPos);
		// pixel radius is some function of this radius
		var pixelRadius = this.pixelRadius;
		if (this.plane !== undefined) {
			for (var i = -pixelRadius; i <= pixelRadius; i++) {
				for (var j = -pixelRadius; j <= pixelRadius; j++) {
					if (agentPixel.x + i >= 0 && agentPixel.y + j >= 0
						&& agentPixel.x + i < this.textureWidth && agentPixel.y + j < this.textureHeight) {
						
						var marker = new Marker();
						marker.pixel = new THREE.Vector2(agentPixel.x + i, agentPixel.y + j);
						marker.position = this.getPos(marker.pixel.x, marker.pixel.y);
						var idx = this.index(agentPixel.x + i, agentPixel.y + j);
						var texture = this.plane.material.map;
						var data = texture.image.data;
						var r = data[idx];
						var g = data[idx + 1];
						var b = data[idx + 2];
						var isWhite = (r == 255 && g == 255 && b == 255);
						var isRed = (r == 255 && g == 0 && b == 0);
						if (!isWhite && !isRed) {
							markers.push(marker);
						}
					}
					
				}
			}
		}
		// return a list of markers in the grid
		return markers;
	}

	resetMarkerOwnership() {
		// change all the pixel values back to black
		if (this.plane !== undefined) {
			var texture = this.plane.material.map;
			var data = texture.image.data;
			for (var i = 0; i < data.length; i++) {
				if (data[i] != 255) data[i] = 0;
			}
		}			
	}

};

export default {
	Grid: Grid
}