const THREE = require('three'); 

/*
 * simple cosine palette set up, to aesthetically color the agents
 */
const a = new THREE.Vector3(0.5, 0.5, 0.5);
const b = new THREE.Vector3(0.5, 0.5, 0.5);
const c = new THREE.Vector3(2.0, 1.0, 0);
const d = new THREE.Vector3(0.5, 0.2, 0.25);

var palette = function(t, a, b, c, d) {
	var x = c.clone().multiplyScalar(t).add(d).multiplyScalar(6.28318);
	x = new THREE.Vector3(Math.cos(x.x), Math.cos(x.y), Math.cos(x.z));
	x.multiply(b).add(a)
	return new THREE.Color().setRGB(x.x, x.y, x.z);
}

/*
 * an animated agent that uses pixel markers to calculate a new velocity
 * that will take them to their goal. 
 */
class Agent {
	constructor() {
		this.mesh; 
		this.vel;
		this.goal;
		this.color; // unique identifier for the agent
					// this is not the same as the mesh color
		this.markers = [];
		// these quantities are used to change the goals if the agent hasn't moved
		this.delta = 0.0; // tracks the change in movement over time
		this.its = 0; // tracks the number of iterations for a tested duraction
	}
}

/*
 * a marker is a pixel on the texture, whose world space location 
 * assists the agent in their velocity calculation. their contribution is 
 * weighted by it's location relative to the agent's location and its alignment
 * with the vector to the agent's goal.
 */
class Marker {
	constructor() {
		this.contribution;
		this.position;
		this.pixel;
		this.agent;
	}
}

/* 
 * the grid is given the voronoi cell data, and writes this data to a texture so that 
 * the agents can only move on the streets modeled by the voronoi cells. if the pixel is 
 * white, it is on the outer bounds of the cell. if it is red, it is on the inner cell.
 *
 * the grid sets up the initial scenario by placing the agents and assigning their goals.
 * 
 * the grid then runs the simulation as follows:
 *     for each agent, collect the pixel markers within some radius of its location.
 *         if the pixel is black, then it doesn't belong to an agent yet, so color this pixel
 *           with the color of the agent. 
 *         if the pixel is some other color, reassign and recolor the
 *           pixel to the current agent if the current agent is closer to the pixel. 
 *         calculate the velocity as a weighted sum of the pixels, taking into account their
 *           their locations and their alignment with the target position.
 *         update the positions. if the agent hasn't moved much in a while, reassign the goal.
 *     reset the marker pixels to their initial configuration.
 */
class Grid {
	constructor(scene, width, height, options, tileGrid) {
		this.scene = scene;

		// number of agent set up
		this.NUM_ROW_AGENTS = 1 / options.NUM_ROW_AGENTS;
		this.NUM_CIRCLE_AGENTS = options.NUM_CIRCLE_AGENTS;

		// radius of pixels for agent velocity calculation
		this.RADIUS = options.RADIUS;

		// speed of the simulation
		this.TIMESTEP = options.TIMESTEP;

		// size of the texture used as markers for the agent
		this.TEXTURE_WIDTH = options.MARKER_DENSITY;
    	this.TEXTURE_HEIGHT = options.MARKER_DENSITY;
		
		// size of the grid for the set up
		this.GRID_WIDTH = width;
		this.GRID_HEIGHT = height;

		// radius of the circle scenario arrangement for agent set up
		this.CIRCLE_RADIUS = options.CIRCLE_RADIUS;
		this.SCENARIO = options.SCENARIO;

		// list of agents, and a map that identifies the agents by colors
		this.agents = [];
		this.colorsToAgents = {};

		// a map of the grid to voronoi tiles that contain the outer and inner edges
		this.tileGrid = tileGrid;
		this.plane;
		this.PIXEL_RADIUS = Math.floor((this.RADIUS / (2 * 
			this.GRID_WIDTH)) * this.TEXTURE_WIDTH) * 2;
	}

	/*
	 * places the agents and sets up their goals according to the set up
	 */
	setup() {
		console.log("Setting up...");
		console.log("Scenario: " + this.SCENARIO);
    	this.initAgents();	
	}

	/*
	 * remove everything from the scene.
	 */
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

	/*
	 * assigns the markers properly and update the velocities and positions.
	 */
	tick() {
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

	/*
	 * Init agent position based on chosen scenario.
	 */
	initAgents() {
		if (this.SCENARIO == "rows") {
			this.initRows();
		}
		else if (this.SCENARIO == "circle") {
			this.initCircle();
		}
	}

	/*
	 * create two rows scenario, and then have agents cross the other side of the plane
	 */
	initRows() {
		// create front row
		for (var i = -this.GRID_WIDTH / 2; i < this.GRID_WIDTH / 2; 
			i += this.NUM_ROW_AGENTS) {
			var agent = new Agent();
			
			// generate a random color for the agent as the id, and another for the mesh
			var color = new THREE.Color().setRGB(Math.random(), Math.random(), Math.random());
			var meshColor = palette(Math.random(), a, b, c, d);
			var material = new THREE.MeshBasicMaterial({ color: meshColor });
			var mesh = new THREE.Mesh(
			    new THREE.IcosahedronGeometry(0.025, 1),
			    material
		  	);
			agent.color = color;
			agent.mesh = mesh;

			// set up the agent position and goal
			agent.mesh.position.set(i, -this.GRID_WIDTH / 2 + 1, 0);
			agent.goal = new THREE.Vector3(-i, this.GRID_WIDTH / 2 - 1, 0);

			// convert the agent's color to rgb, and then to a string
			// the color string is used as a unique identifier for the agent later
		  	var colorId = new THREE.Vector3(Math.floor(color.r * 255), 
		  		Math.floor(color.g * 255), Math.floor(color.b * 255));
			var idStr = this.colorToId(colorId);
			this.colorsToAgents[idStr] = agent;
			this.agents.push(agent);
			
			// finally, we add the agent to the scene
			this.scene.add(agent.mesh);
		}

		// create back row
		for (var i = -this.GRID_WIDTH / 2; i < this.GRID_WIDTH / 2; 
			i += this.NUM_ROW_AGENTS) {
			var agent = new Agent();
			
			// generate a random color for the agent as the id, and another for the mesh
			var color = new THREE.Color().setRGB(Math.random(), Math.random(), Math.random());
			var meshColor = palette(Math.random(), a, b, c, d);
			var material = new THREE.MeshBasicMaterial({ color: meshColor });
			var mesh = new THREE.Mesh(
			    new THREE.IcosahedronGeometry(0.025, 1),
			    material
		  	);
			agent.color = color;
			agent.mesh = mesh;

			// set up the agent position and goal
			agent.mesh.position.set(i, this.GRID_WIDTH / 2 - 1, 0);
			agent.goal = new THREE.Vector3(-i, -this.GRID_WIDTH / 2 + 1, 0);

			// convert the agent's color to rgb, and then to a string
			// the color string is used as a unique identifier for the agent later
		  	var colorId = new THREE.Vector3(Math.floor(color.r * 255), 
		  		Math.floor(color.g * 255), Math.floor(color.b * 255));
			var idStr = this.colorToId(colorId);
			this.colorsToAgents[idStr] = agent;
			this.agents.push(agent);
			
			// finally, we add the agent to the scene
			this.scene.add(agent.mesh);
		}
	}

	/* 
	 * create a circular scenario. does this through parametric coordinates.
	 */
	initCircle() {
		var t = 0; // current angle in the circle
		for (var i = 0; i < this.NUM_CIRCLE_AGENTS; i++) {
			var agent = new Agent();
			
			// generate the color id and the mesh color
			var color = new THREE.Color().setRGB(Math.random(), Math.random(), Math.random());
			agent.color = color;
			var meshColor = palette(Math.random(), a, b, c, d);
			var material = new THREE.MeshBasicMaterial({ color: meshColor });
			var mesh = new THREE.Mesh(
			    new THREE.IcosahedronGeometry(.025, 1),
			    material
		  	);

		  	// store the agent in the scenario with its unique color identifier
		  	var colorId = new THREE.Vector3(Math.floor(color.r * 255), 
		  		Math.floor(color.g * 255), Math.floor(color.b * 255));
			var idStr = this.colorToId(colorId);
			this.colorsToAgents[idStr] = agent;
		  	agent.mesh = mesh;

		  	// determine the location according to the current angle in the circle
			var x = this.CIRCLE_RADIUS * Math.sin(t);
			var y = this.CIRCLE_RADIUS * Math.cos(t);
			agent.mesh.position.set(x, y, 0);

		
			// set up goal to be half a circle away
			agent.goal = new THREE.Vector3(this.CIRCLE_RADIUS * Math.sin(t + Math.PI), 
				this.CIRCLE_RADIUS * Math.cos(t + Math.PI), 
				0);

			// add to scene and store agent in table
			this.scene.add(agent.mesh);
			this.agents.push(agent);

			// update the current angle
			t += 2 * Math.PI / this.NUM_CIRCLE_AGENTS;
		}
	}

	/*
	 * get k nearest pixels to the current agent position
	 * this will be passed to the agent velocity calculation
	 */
	getMarkers(agentPos) {
		var markers = [];
		var agentPixel = this.getPixel(agentPos);
		var pixelRadius = this.PIXEL_RADIUS;
		if (this.plane !== undefined) {
			for (var i = -pixelRadius; i <= pixelRadius; i++) {
				for (var j = -pixelRadius; j <= pixelRadius; j++) {
					// check if the pixel we're checking is in the bounds of the texture
					if (agentPixel.x + i >= 0 && 
						agentPixel.y + j >= 0 && 
						agentPixel.x + i < this.TEXTURE_WIDTH && 
						agentPixel.y + j < this.TEXTURE_HEIGHT) {
						
						// init a new marker with the pixel coordinates and its cooresponding world coord
						var marker = new Marker();
						marker.pixel = new THREE.Vector2(agentPixel.x + i, agentPixel.y + j);
						marker.position = this.getPos(marker.pixel.x, marker.pixel.y);

						// if the pixel is black, then add it to the markers passed to the velocity calculation
						// this ensures that pixels that are within the voronoi cells are not used
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
		return markers;
	}
	
	/*
	 * for each marker, color it with the current agents color if it is the closest agent
	 */
	assignMarkers(agent, gridMarkers) {
		if (this.plane !== undefined) {
			for (var j = 0; j < gridMarkers.length; j++) {
				var marker = gridMarkers[j];
				var currDistance = (new THREE.Vector3().subVectors(marker.position, 
					agent.mesh.position)).length();
				
				// only use the pixels in the agents radius
				if (currDistance < this.RADIUS) {
					var texture = this.plane.material.map;
					var data = texture.image.data;
					var idx = this.index(marker.pixel.x, marker.pixel.y);
					if (idx > data.length) 
						continue;
					
					// get the current pixel color
					var r = data[idx];
					var g = data[idx + 1];
					var b = data[idx + 2];

					// if it is black, then it doesn't belong to anyone.
					// we then color this pixel with the agent's color.
					if (r == 0 && g == 0 && b == 0) {
						data[idx] = Math.floor(agent.color.r * 255);
						data[idx + 1] = Math.floor(agent.color.g * 255);
						data[idx + 2] = Math.floor(agent.color.b * 255);
						agent.markers.push(marker);
					} else {
						// if the marker belongs to someone else, we retrieve
						// the other agent through the color id.
						// we recolor it with this current agent's color if the
						// current agent is closer.
						var color = new THREE.Vector3(r, g, b);
						var strIdx = this.colorToId(color);
						var markerAgent = this.colorsToAgents[strIdx];
						 var closest = (new THREE.Vector3().subVectors(marker.position, 
						 	markerAgent.mesh.position, agent.mesh.position)).length();
						var closer = currDistance < closest;
						if (closer) {
							agent.markers.push(marker);		
							data[idx] = Math.floor(agent.color.r * 255);
							data[idx + 1] = Math.floor(agent.color.g * 255);
							data[idx + 2] = Math.floor(agent.color.b * 255);
						}
					}
				}
				
			}
			this.plane.material.map.needsUpdate = true;
			this.plane.material.needsUpdate = true;
		}
	}

	/*
	 * calculate the velocity of the agent passed to the function
	 * using its markers.
	 */
	updateVelocity(agent) {
		agent.vel = new THREE.Vector3(0, 0, 0);
		var totalContribution = 0.0;
		var x = agent.mesh.position;

		// vector to the goal 
		var g = new THREE.Vector3().subVectors(x, agent.goal);

		// for each of the markers, their contribution 
		// is weighted by the distance to the agent (m)
		// and their alignment with the goal (g)
		for (var i = 0; i < agent.markers.length; i++) {
			var a = agent.markers[i].position;
			var m = new THREE.Vector3().subVectors(x, a);
			agent.markers[i].contribution = 
			(1 + m.dot(g) / 
				(m.length() * g.length())) / (1 + m.length());
			totalContribution += agent.markers[i].contribution;
		}

		// update the velocity using the new marker contributions
		for (var i = 0; i < agent.markers.length; i++) {
			var a = agent.markers[i].position;
			var m = new THREE.Vector3().subVectors(a, x);
			agent.vel.add(m.multiplyScalar(agent.markers[i].contribution / totalContribution));
			agent.markers[i].contribution = 0;
		}

		// clip the velocity
		if (agent.vel.length() > this.RADIUS) {
			agent.vel.normalize().multiplyScalar(this.RADIUS);
		}

		// remove all the markers after the calculation is done
		agent.markers = agent.markers.filter(function (marker) {
			return false;
		});
	}

	/*
	 * eulerian position update.
	 * track the change in position over some number of iterations to update goal.
	 */
	updatePosition(agent) {
		var prev = agent.mesh.position;
		agent.mesh.position.add(agent.vel.multiplyScalar(this.TIMESTEP));
		
		agent.delta += prev.distanceTo(agent.mesh.position);
		agent.its++;

		// if after a certain number of iterations, 
		// the agent hasn't progressed much, change the goal
		// randomized so that the agent goal change is more staggered
		if (agent.its > 50 + 400 * Math.random()) {
			if (agent.delta < 0.0001) {
				agent.goal = new THREE.Vector3(
					Math.random() * this.GRID_WIDTH - this.GRID_WIDTH / 2,
					Math.random() * this.GRID_WIDTH - this.GRID_WIDTH / 2,
					Math.random() * this.GRID_WIDTH - this.GRID_WIDTH / 2);
			}
			agent.delta = 0.0;
			agent.its = 0;
		}
	}

	// TO DO: CAN USE FOR SNAPPING.
	distToSegment(p1, p2, point) {
		return Math.abs((p2.y - p1.y) * point.x - 
			(p2.x - p1.x) * point.y + 
			p2.x * p1.y - 
			p2.y * p1.x) / p1.distanceTo(p2);
	}
	

	/*
	 * if the pixels are not in the voronoi cells, then change
	 * their ownership back to none (black) after each frame.
	 */
	resetMarkerOwnership() {
		if (this.plane !== undefined) {
			var texture = this.plane.material.map;
			var data = texture.image.data;
			for (var i = 0; i < data.length; i++) {
				if (data[i] != 255) data[i] = 0;
			}
		}			
	}

	/*
	 * ALL VORONOI TEXTURE WRITING FUNCTIONS.
	 */

	/*
	 * param:width is the width of the texture.
	 * returns a textured plane that holds the voronoi data.
	 * the pixels are white if they are within the outer voronoi cell, and red 
	 * if they are within the inner voronoi cell.
	 */
	writeVoronoi(width) {
		var height = width;
		var planeGeo = new THREE.PlaneGeometry(this.GRID_WIDTH, 
			this.GRID_HEIGHT, this.GRID_WIDTH, this.GRID_HEIGHT);
		var size = width * height;
	    var data = new Uint8Array(3 * size);

	    // fill the data array with black.
	    // for each pixel, get its world space location and test
	    // if its in the outer or inner voronoi cell and color accordingly.
		for (var i = 0; i < size; i++) {
			var stride = i * 3;
			data[stride] = 0;
			data[stride + 1] = 0;
			data[stride + 2] = 0;

			// get the world space position of this pixel
			var px = this.getPixelCoordinates(stride);
			var pos = this.getPos(px.x, px.y);
			
			// find grid cell that pos is in
			var x = Math.floor(pos.x);
			var y = Math.floor(pos.y);

			// using the grid location, get the k closest voronoi tiles
			var cells = this.getClosestVoronoiCells(x, y);
			for (var m = 0; m < cells.length; m++) {
        		if (this.pointInPolygon(pos, cells[m])) {
        			if (this.pointInSmallerPolygon(pos, cells[m])) { 
        				// if inside the inner poly, make red
        				data[stride] = 255;
						data[stride + 1] = 0;
						data[stride + 2] = 0;
	        			break;
        			} else { 
        				// if only inside the outer poly, make it white
        				data[stride] = 255;
						data[stride + 1] = 255;
						data[stride + 2] = 255;
	        			break;
        			}
        		}
            }
		}

		// initialize the plane using this texture data
		var texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
		var planeMat = new THREE.MeshBasicMaterial({map : texture});
    	var plane = new THREE.Mesh( planeGeo, planeMat );
    	plane.material.map = texture;
		plane.material.map.needsUpdate = true;
		plane.material.needsUpdate = true;

    	return plane;
	}
	
	/*
	 * if the pixel is white, it is within some voronoi cell's boundaries.
	 */
	inCellPixelTest(v) {
		var p = this.getPixel(v);
		var idx = this.index(p.x, p.y);
		var texture = this.plane.material.map;
		var data = texture.image.data;
		var r = data[idx];
		var g = data[idx + 1];
		var b = data[idx + 2];
		return r == 255 && g == 255 && b == 255;
	}

	/*
	 * if the pixel is red, it is within some voronoi cell's inner boundaries.
	 */
	inSmallerCellPixelTest(v) {
		var p = this.getPixel(v);
		var idx = this.index(p.x, p.y);
		var texture = this.plane.material.map;
		var data = texture.image.data;
		var r = data[idx];
		var g = data[idx + 1];
		var b = data[idx + 2];
		return r == 255 && g == 0 && b == 0;
	}

	/*
	 * get the 9 closest voronoi cells in the grid.
	 */
	getClosestVoronoiCells(x, y) {
		var closeTiles = [];
    	for (var k = -1; k <= 1; k++) {
    		for (var l = -1; l <= 1; l++) {
    			if (this.tileGrid[x + k] !== undefined) {
    				if (this.tileGrid[x + k][y + l] !== undefined) {
    					closeTiles.push(this.tileGrid[x + k][y + l]);
    				}
    			}
    		}
    	}
    	return closeTiles;
	}

	/*
	 * if a line to infinity from the point intersects with the 
	 * polygon an odd number of times, it is inside the polygon.
	 */
	pointInPolygon(v, polygon) {
		var count = 0;
		var inf = new THREE.Vector3(10000.0, 10000.0, 0);
		polygon.edges.forEach(function (edge) {
			if (this.intersectionTest(v, inf, edge.a, edge.b) !== undefined) {
				count++;
			}
		}, this);
		return count % 2 != 0;
	}

	/*
	 * same test as above, but tests the inner edges of the voronoi polygon
	 */
	pointInSmallerPolygon(v, polygon) {
		var count = 0;
		var inf = new THREE.Vector3(10000.0, 10000.0, 0);
		polygon.innerEdges.forEach(function (edge) {
			if (this.intersectionTest(v, inf, edge.a, edge.b) !== undefined) {
				count++;
			}
		}, this);
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
			//  x and y are the points of intersection
			var x = (B2 * C1 - B1 * C2) / det;
			var y = (A1 * C2 - A2 * C1) / det;
			
			// function checks if a point is on the line segment
			var inBounds = function (point, p1, p2) {
				var x = point.x;
		        var y = point.y;
		        var  onLine = x >= Math.min(p1.x, p2.x) && x <= Math.max(p1.x, p2.x)
		               && y >= Math.min(p1.y, p2.y) && y <= Math.max(p1.y, p2.y);
		        return onLine;
			};

			// check if x and y are within the bounds
			var intersection = new THREE.Vector3(x, y, 0);
			if (inBounds(intersection, e0, e1) && 
				inBounds(intersection, o0, o1)) {
				return intersection;
			}
			
		}
	}

	/*
	 *** agent id helper functions
	 */

	/*
	 * get the agent by the color
	 */
	getAgent(color) {
		return this.colorsToAgents[new THREE.Vector3(Math.floor(color.r * 255), 
			Math.floor(color.g * 255), Math.floor(color.b * 255))];
	}

	/*
	 * convert the color data to a string for the ids
	 */
	colorToId(color) {
		return "" + color.x + "" + color.y + "" + color.z
	}

	/*
	 *** helper functions for world space to texture space 
	 */

	/*
	 * get the index in the texture array using the pixel coordinate
	 */
	index(x, y) {
		return 3 * (y * this.TEXTURE_WIDTH + x);
	}

	/*
	 * get the pixel coordinate from the world space coordination.
	 */
	getPixel(pos) {
		var x = (pos.x + this.GRID_WIDTH / 2) / this.GRID_WIDTH;
		var y = (pos.y + this.GRID_HEIGHT / 2) / this.GRID_HEIGHT; 
		return new THREE.Vector2(Math.floor(x * this.TEXTURE_WIDTH), 
			Math.floor(y * this.TEXTURE_HEIGHT));
	}

	/*
	 * get world space location on the texture from the pixel coordinates.
	 */
	getPos(x, y) {
		var a = x / this.TEXTURE_WIDTH;
		a *= this.GRID_WIDTH;
		a -= this.GRID_WIDTH / 2;
		var b = y / this.TEXTURE_HEIGHT;
		b *= this.GRID_HEIGHT;
		b -= this.GRID_HEIGHT / 2;
		return new THREE.Vector3(a, b, 0);
	}

	/*
	 * get the 2D pixel coordinates using the index in the 1D array.
	 */
	getPixelCoordinates(index) {
		var idx = index / 3;
		var y = Math.floor(idx / this.TEXTURE_HEIGHT);
		var x = idx % this.TEXTURE_WIDTH;
		return new THREE.Vector2(x, y);
	}
};

export default {
	Grid: Grid
}