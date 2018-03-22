const THREE = require('three'); 
import Voronoi from './voronoi.js'
console.log(Voronoi)
class Agent {
	constructor() {
		this.mesh; 
		this.vel;
		this.goal;
		this.orientation;
		this.size = 0.25;
		this.markers = [];
		this.color;
	}
}

class Marker {
	constructor() {
		this.contribution;
		this.position;
		this.agent;
		this.colorIndex;
		this.agentIndex;
	}
}

class Grid {
	constructor(scene, width, height, options, tileGrid) {
		this.AGENT_SIZE = options.AGENT_SIZE;
		this.MORE_ROW_AGENTS = 1 / options.MORE_ROW_AGENTS;
		this.NUM_AGENTS = options.NUM_AGENTS;
		this.MARKER_DENSITY = options.MARKER_DENSITY;
		this.RADIUS = options.RADIUS;
		this.CIRCLE_RADIUS = options.CIRCLE_RADIUS;
		this.TIMESTEP = options.TIMESTEP;
		this.SHOW_MARKERS = options.markers;

		this.scene = scene;
		this.w = width;
		this.h = height;
		this.plane;
		this.markerMesh;
		this.agents = [];
		this.markers = [];
		this.scenario = options.scenario;
		this.table = [];
		this.colors = [];
		this.tileGrid = tileGrid;
		console.log(tileGrid)

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

	setup() {
		console.log("Setting up...");
		console.log("Scenario: " + this.scenario);

		var planeGeo = new THREE.PlaneGeometry(this.w, this.h, this.w, this.h);
    	var planeMat = new THREE.MeshBasicMaterial({color: 0xffffff, 
    		side: THREE.DoubleSide, wireframe: true});
    	var plane = new THREE.Mesh( planeGeo, planeMat );

    	plane.geometry.verticesNeedUpdate = true;
		plane.geometry.dynamic = true;

    	this.plane = plane;

    	this.scatterPoints();
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
			// Set up goal 
			agent.goal = new THREE.Vector3(i,  this.w / 2 - 1, 0);

			// Set up mesh
			var geometry = new THREE.CylinderGeometry( this.AGENT_SIZE, 
				this.AGENT_SIZE, 
				this.AGENT_SIZE,
				10);

			agent.color  = new THREE.Color().setRGB(0, 
				(Math.random() + 1) / 2, 
				(Math.random() + 1) / 2);

			var material = new THREE.MeshBasicMaterial( { color: agent.color } );
			var cylinder = new THREE.Mesh( geometry, material );
			agent.mesh = cylinder;
			agent.mesh.position.set(i, -this.w / 2 + 1, 0);

			// Add to scene and store agent
			this.scene.add(agent.mesh);
			this.agents.push(agent);
		}

		// Create back row
		for (var i = -this.w / 2; i < this.w / 2; 
			i += this.MORE_ROW_AGENTS*this.AGENT_SIZE) {
			var agent = new Agent();
			agent.size = this.AGENT_SIZE;
			agent.goal = new THREE.Vector3(i, -this.w / 2 + 1, 0);

			// Set up mesh
			var geometry = new THREE.CylinderGeometry( 
				this.AGENT_SIZE, 
				this.AGENT_SIZE, 
				this.AGENT_SIZE, 
				10);

			agent.color = new THREE.Color().setRGB((Math.random() + 1) / 2, 
				0, (Math.random() + 1) / 2);
			var material = new THREE.MeshBasicMaterial( { color: agent.color } );
			var cylinder = new THREE.Mesh( geometry, material );
			agent.mesh = cylinder;
			agent.mesh.position.set(i, this.w / 2 - 1, 0);

			// Add to scene and store agent in table
			this.scene.add(agent.mesh);
			this.agents.push(agent);
		}
	}

	/* 
	 * Create a circular scenario.
	 */
	initCircle() {
		var t = 0;
		for (var i = 0; i < this.NUM_AGENTS; i++) {
			var agent = new Agent();
			agent.size = this.AGENT_SIZE;
			
			// Set up mesh
			var geometry = new THREE.CylinderGeometry( this.AGENT_SIZE, 
				this.AGENT_SIZE, 
				this.AGENT_SIZE, 10);
			agent.color = new THREE.Color().setRGB(0, 
				Math.random(), 
				Math.random());
			var material = new THREE.MeshBasicMaterial( { color: agent.color } );
			var cylinder = new THREE.Mesh( geometry, material );
			agent.mesh = cylinder;
			var x = this.CIRCLE_RADIUS * Math.sin(t);
			var y = this.CIRCLE_RADIUS * Math.cos(t);
			var z = agent.size / 2;
			agent.mesh.position.set(x, y, z);


			// Add to scene and store agent in table
			this.scene.add(agent.mesh);
			this.agents.push(agent);

			// Set up goal to be half a circle away
			agent.goal = new THREE.Vector3(this.CIRCLE_RADIUS * Math.sin(t + Math.PI), 
				this.CIRCLE_RADIUS * Math.cos(t + Math.PI), 
				0);

			t += 2 * Math.PI / this.NUM_AGENTS;
		}
		
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
		console.log(this.tileGrid)
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

		agent.markers.length = 0;
	}

	updatePosition(agent) {
		agent.mesh.position.add(agent.vel.multiplyScalar(this.TIMESTEP));

		// var newPos = new THREE.Vector3().addVectors(agent.vel.multiplyScalar(this.TIMESTEP), agent.mesh.position);
		// //agent.mesh.position.add(agent.vel.multiplyScalar(this.TIMESTEP));
		// var x = Math.floor(newPos.x);
		// var y = Math.floor(newPos.y);
		// var closeVoronoi = this.getClosestVoronoiCells(x, y);
		// var invalid = false;
		// for (var i = 0; i < closeVoronoi.length; i++) {
		// 	var cell = closeVoronoi[i];
		// 	if (this.pointInPolygon(newPos, cell)) {
		// 		// add the normal of the closest edge
		// 		var closestEdge = cell.edges[0];
		// 		var minDistance = Infinity;
		// 		for (var j = 0; j < cell.edges.length; j++) {
		// 			// get distance from the agent to the line
		// 			var dist = this.distToSegment(cell.edges[j].a, cell.edges[j].b, newPos);
		// 			if ( dist < minDistance) {
		// 				minDistance = dist;
		// 				closestEdge = cell.edges[j];
		// 			}
		// 		}
		// 		// now that we have the closest edge, get the normal
		// 		// var hp = new Voronoi.HalfPlane(closestEdge.a, closestEdge.b);
		// 		// var normal = new THREE.Vector3().subVectors(hp.createLeftPoint(5), hp.createRightPoint(5)).normalize();
		// 		// if (normal.dot(new THREE.Vector3().subVectors(cell.midpoint, agent.mesh.position)) < 0) {
		// 		// 	normal.multiplyScalar(-1);
		// 		// }
		// 		//agent.vel.add(normal);
		// 		agent.vel = 
		// 		invalid = true;
		// 		break;
		// 	}

		// }
		// if (invalid) {
		// 	agent.mesh.position.add(agent.vel.multiplyScalar(this.TIMESTEP));
		// } else {
		// 	agent.mesh.position.set(newPos.x, newPos.y, newPos.z);
		// }
	}

	distToSegment(p1, p2, point) {
		return Math.abs((p2.y - p1.y) * point.x - 
			(p2.x - p1.x) * point.y + 
			p2.x * p1.y - 
			p2.y * p1.x) / p1.distanceTo(p2);
	}

	assignMarkers(agent, gridMarkers) {
		for (var j = 0; j < gridMarkers.length; j++) {
			// distance to this agent
			var currDistance = (new THREE.Vector3().subVectors(gridMarkers[j].position, 
				agent.mesh.position)).length();
			var unassigned = false;
			var closer = false;
			if (currDistance < this.RADIUS) {
				// Already assigned closest marker
				if (gridMarkers[j].agent === undefined) {
					// Assign new agent
					gridMarkers[j].agent = agent;
					agent.markers.push(gridMarkers[j]);
					gridMarkers[j].agentIndex = agent.markers.length - 1;

					// Update
					this.markerMesh.geometry.colors[gridMarkers[j].colorIndex] = 
					agent.color;
				} else {
					var closest = (new THREE.Vector3().subVectors(gridMarkers[j].position, 
						gridMarkers[j].agent, agent.mesh.position)).length();
					closer = currDistance < closest;
					if (closer) {
						gridMarkers[j].agent.markers.splice(gridMarkers[j].agentIndex, 1);
						for (var i = 0; i < gridMarkers[j].agent.markers.length; i++) {
							gridMarkers[j].agent.markers[i].agentIndex = i;
						}
						// Assign new agent
						gridMarkers[j].agent = agent;
						agent.markers.push(gridMarkers[j]);
						gridMarkers[j].agentIndex = agent.markers.length - 1;		
						// Update color
						this.markerMesh.geometry.colors[gridMarkers[j].colorIndex] = 
						agent.color;
					}
				}
			}
			
		}
		this.markerMesh.geometry.colorsNeedUpdate = true;
	}

	// We're only interested in markers in the surrounding grid
	getMarkers(agentPos) {
		var x = Math.floor(agentPos.x) + this.w / 2;
		var z = Math.floor(agentPos.y) + this.h / 2;
		var markers = [];
		for (var a = -1; a <= 1; a++) {
			for (var b = -1; b <= 1; b++) {
				if (x + a > -1 && x + a < this.w && 
					z + b > -1 && z + b < this.h) {
					for (var i = 0; i < this.table[x + a][z + b].length; i++) {
						markers.push(this.table[x + a][z + b][i]);
					}
				}
			}
		}

		return markers;
	}

	resetMarkerOwnership() {
		for (var i = 0; i < this.markers.length; ++i) {
			this.markers[i].agent = undefined;
			this.markerMesh.geometry.colors[this.markers[i].colorIndex] = 
						new THREE.Color();
		}
	}

};

export default {
	Grid: Grid
}