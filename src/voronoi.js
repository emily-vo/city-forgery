const THREE = require('three');
const VORONOI = require('voronoi')
import MapData from './mapdata.js'

class Site {
	constructor (gridPoint) {
		this.geoPos = gridPoint;
		this.mapPos;
		this.t;	
		this.id;
	}

	fromMapPoint(gridPoint) {
		// sample position 
		var x = gridPoint.x;
		var z = gridPoint.y;
		var x1 = x + Math.random();
		var z1 = z + Math.random();
		this.geoPos = new THREE.Vector3(x1, 0, z1);
		this.mapPos = new THREE.Vector3(x1, z1, 0);
	}
}

class Edge {
	constructor(a, b) {
		this.a = a;
		this.b = b;
		this.delete = false;
	}
	dist(point) {
		var m = (this.b.z - this.a.z) / (this.b.x - this.a.x);
		// y = mx + b
		var b0 = this.a.z - m * this.a.x;


		var x0 = point.x;
		var y0 = point.z;
		// convert to cartesian
		var a = -m;
		var b = 1;
		var c = -b0;

		var x = (b  * (b * x0 - a * y0) - a * c) / (a * a + b * b);
		var y = (a * (-b * x0 + a * y0) - b * c) / (a * a + b * b);

		return point.distanceTo(new THREE.Vector3(x, 0, y));
	}
}

class Cell {
	constructor(site, edges) {
		this.edges = edges ? edges : [];
		this.site = site;
	}
}

class PB {
	constructor(m, b, midpoint) {
		this.m = m;
		this.b = b;
		this.midpoint = midpoint;
	}
	dist(point) {
		var x0 = point.x;
		var y0 = point.z;
		// convert to cartesian
		var a = -this.m;
		var b = 1;
		var c = -this.b;

		var x = (b  * (b * x0 - a * y0) - a * c) / (a * a + b * b);
		var y = (a * (-b * x0 + a * y0) - b * c) / (a * a + b * b);

		return point.distanceTo(new THREE.Vector3(x, 0, y));
	}

	spacialTest(p) {
		// x = t
		// y = mt + b
		// find a (t = -100)
		var a = new THREE.Vector3(-20, 0, -20 * this.m + this.b);
		// find b (t = 100)
		var b = new THREE.Vector3(20, 0, 20 * this.m + this.b);
		return (new THREE.Vector3().subVectors(p, a)).dot(new THREE.Vector3().subVectors(b, a));
	}

	draw(scene) {
		// x = t
		// y = mt + b
		// find a (t = -100)
		var a = new THREE.Vector3(-20, 0, -20 * this.m + this.b);
		// find b (t = 100)
		var b = new THREE.Vector3(20, 0, 20 * this.m + this.b);

		// use green
		var geometry = new THREE.Geometry();
		var material = new THREE.LineBasicMaterial({ color: 0x00ff00, weight: 2 });
		geometry.vertices.push(a);
		geometry.vertices.push(b);
		var line = new THREE.Line(geometry, material);
		//this.edgeGeo.push(line);
		scene.add(line);
	}
}



class Voronoi {
	constructor (mapData, numPoints) {
		var testPB = new PB(1, 0);
		//console.log(testPB.dist(new THREE.Vector3(2, 0, 1)));
		//console.log(this.findPB(new THREE.Vector3(1, 0, 1), new THREE.Vector3(1, 0, 0)));
		this.sites = [];
		this.edges = [];
		this.cells = [];

		this.numPoints = numPoints;
		this.water = mapData.water;
		this.population = mapData.pop;
		this.mapData = mapData;
		this.mapVerts = mapData.water.geo.vertices;
		
		this.edgeGeo = [];
		this.scene = mapData.scene;
		this.colors = [];
		
		this.generateSites();
		this.dummyCellSetUp();
		//this.drawScene();

		this.sites.forEach(function(site) {
			var cell = new Cell(site);
			//console.log(this.cells.length);
			this.cells.forEach(function(c) {
				// find perpindicular bisector
				var pb = this.findPB(c.site.geoPos, cell.site.geoPos);
				//pb.draw(this.scene);

				var criticalPoints = [];
				c.edges.forEach(function(e) {
					// if e is closer to site than c's
					if (e.dist(site.geoPos) < e.dist(c.site.geoPos)) {
						//e.delete = true;					
					}

					// edge in slope intersect
					var A1 = e.b.z - e.a.z;
					var B1 = e.a.x - e.b.x;
					var C1 = A1 * e.a.x + B1 * e.a.z;

					var A2 = -pb.m;
					var B2 = 1;
					var C2 = pb.b;

					var det = A1 * B2 - A2 * B1;
					if (Math.abs(det) < 0.001) {
						// parallel lines
					} else { // if e intersects pb
						// add new point of intersection
						var x = (B2 * C1 - B1 * C2) / det;
           				var y = (A1 * C2 - A2 * C1) / det;
           				var intersection = new THREE.Vector3(x, 0, y);
						criticalPoints.push(intersection);
						//console.log(intersection);
						// clip edge to the far side
						if (e.a.distanceTo(c.site.geoPos) < e.b.distanceTo(c.site.geoPos)) {
							e.b = intersection;
						} else {
							e.a = intersection;
						}
					}
				

				}, this);
				// add new edge from intersection points
				if (criticalPoints.length == 2) {
					//console.log("found intersection");
					var ne = new Edge(criticalPoints[0], criticalPoints[1]);
					//console.log(ne);
					this.edges.push(ne);
					cell.edges.push(ne);
					c.edges.push(ne);
				}

				// delete edges as necessary
				c.edges = c.edges.filter(function(edge) {
				 	return !edge.delete;
			    });	
			}, this);
			// add new cell 
			this.cells.push(cell);
		}, this);
		//this.drawScene();
	}

	// find the perpindicular bisector
	findPB(a, b) {
		var midpoint = (new THREE.Vector3()).addVectors(a, b);
		midpoint.multiplyScalar(0.5);
		var slope = (b.z - a.z) / (b.x - a.x);
		var negRecip = -(1 / slope);
		var b = midpoint.z - negRecip * midpoint.x;
		var pb = new PB();
		pb.m = negRecip;
		pb.b = b;
		pb.midpoint = midpoint;
		return pb;
	}

	dummyCellSetUp() {
		var w = this.mapData.gridSize;
		var h = this.mapData.gridSize;
		
		// add three or four points at "infinity" to cells set, to bound diagram
		var dum1 = new THREE.Vector3(-w / 1.5, 0, -h / 1.5);
		var dum4 = new THREE.Vector3(-w / 1.5, 0, h / 1.5);
		var dum2 = new THREE.Vector3(w / 1.5, 0, -h / 1.5);
		var dum3 = new THREE.Vector3(w / 1.5, 0, h / 1.5);
		
		
		var a = new THREE.Vector3(-2 * w, 0, 0);
		var b = new THREE.Vector3(0, 0, 0);
		var c = new THREE.Vector3(0, 0, 2 * h);
		var d = new THREE.Vector3(2 * w, 0, 0);

		var e = new THREE.Vector3(-2 * w, 0, 0);
		var f = new THREE.Vector3(0, 0, 0);
		var g = new THREE.Vector3(0, 0, -2 * h);
		var h = new THREE.Vector3(2 * w, 0, 0);

		var edges1 =  [
			new Edge(a, b),
			new Edge(b, c),
			new Edge(c, a)
		];

		
		var edges2 =  [
			new Edge(b, c),
			new Edge(c, d),
			new Edge(d, b)
		];

		var edges3 =  [
			new Edge(f, e),
			new Edge(e, g),
			new Edge(g, f)
		];

		var edges4 =  [
			new Edge(f, g),
			new Edge(g, h),
			new Edge(h, f),
		];
		

		this.cells.push(new Cell(new Site(dum1), edges3));
		this.cells.push(new Cell(new Site(dum2), edges4));
		this.cells.push(new Cell(new Site(dum3), edges2));
		this.cells.push(new Cell(new Site(dum4), edges1));
	}

	drawSites() {
		// draw sites
		var dotGeometry = new THREE.Geometry();
		this.sites.forEach(function (site) {
			dotGeometry.vertices.push(site.geoPos);
			var color = new THREE.Color();
			color.setRGB(1, 0, 0);
			this.colors.push(color);
		}, this);

		
	}

	drawCells() {
		var dotGeometry = new THREE.Geometry();
		this.cells.forEach(function (cell) {
			dotGeometry.vertices.push(cell.site.geoPos);
			var color = new THREE.Color();
			color.setRGB(1, 0, 0);
			this.colors.push(color);

			cell.edges.forEach(function(edge) {
				var geometry = new THREE.Geometry();
				var material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 4});
				geometry.vertices.push(edge.a);
				geometry.vertices.push(edge.b);
				var line = new THREE.Line(geometry, material);
				this.edgeGeo.push(line);
				this.scene.add(line);
			}, this);
		}, this);
		console.log(dotGeometry);
		// create the site geometry and set up the scene
		dotGeometry.colors = this.colors;
		var dotMaterial = new THREE.PointsMaterial( {size: 1, vertexColors: THREE.VertexColors} );
		if (this.siteMesh) this.scene.remove(this.siteMesh);

		this.siteMesh = new THREE.Points(dotGeometry, dotMaterial);
		
		this.scene.add(this.siteMesh);


	}

	drawScene() {
		this.drawCells();
	}

	generateSites() {
		var dotGeometry = new THREE.Geometry();
		var temp = [];
		for (var i = 0; i < this.mapVerts.length; i++) {
			var x = this.mapVerts[i].x;
			var z = this.mapVerts[i].y;
			var site = new Site(new THREE.Vector3(x, 0, z));
			site.fromMapPoint(this.mapVerts[i]);
			var clipped = this.clipped(site.geoPos);
			var onLand = this.water.onLand(site.mapPos);
			if (!clipped && onLand) {
				temp.push(site);
				site.t = this.water.t(site.mapPos);
			}
		}

		// sort the sites by their noise value
		
		temp.sort(function(a, b) {
			return b.t - a.t;
		});
		

		// save the n highest value sites
		var length = temp.length > this.numPoints ? this.numPoints : temp.length;
		for (var i = 0; i < length; i++) {
			//this.sites
			//.push(temp[i]);
		}
		var left = new Site(new THREE.Vector3(1, 0, 1));
		left.id = "left";
		this.sites.push(left);

		var right = new Site(new THREE.Vector3(0, 0, -1));
		right.id = "right";
		this.sites.push(right);
		//this.sites.push(new Site(new THREE.Vector3(-5, 0, -7)));
		//this.sites.push(new Site(new THREE.Vector3(-2, 0, 5)));
		//this.sites.push(new Site(new THREE.Vector3(4.5, 0, -5)));
	}

	clipped(vert) {
		return (vert.z > (this.mapData.gridSize / 2) - 1)
		|| (vert.x > (this.mapData.gridSize / 2) - 1);
	}

	remove() {
		this.scene.remove(this.siteMesh);
		this.edgeGeo.forEach(function (line) {
			this.scene.remove(line);
		}, this);
	}

	show() {
		this.scene.add(this.siteMesh);
		this.edgeGeo.forEach(function (line) {
			this.scene.add(line);
		}, this);
	}
}

export default {
	Voronoi: Voronoi
}

/*
					if (distSite < distA && distSite < distB) {
						// Check if the distance between the site and the pb is less than
						// both points of the edge. If it is, we ignore that edge.
						console.log("intersection");
						// If one of the points is closer and the other is farther,
						// find the intersection point between the edge and the pb.
						
						// edge in slope intersect
						var A1 = e.b.z - e.a.z;
						var B1 = e.a.x - e.b.x;
						var C1 = A1 * e.a.x + B1 * e.a.z;

						var A2 = -pb.m;
						var B2 = 1;
						var C2 = pb.b;

						var det = A1 * B2 - A2 * B1;
						if (Math.abs(det) < 0.001) {
							// parallel lines
						} else {
							// add new point of intersection
							var x = (B2 * C1 - B1 * C2) / det;
               				var y = (A1 * C2 - A2 * C1) / det;
               				var intersection = new THREE.Vector3(x, 0, y);
							criticalPoints.push(intersection);
						}
					} 
					else if (distA < distSite && distB < distSite) {
						// If both points of the edge have distance less than the
						// distance to pb, delete the edge.
						console.log("delete");
						e.delete = true;
					} else {
						console.log("intersection");
						// If one of the points is closer and the other is farther,
						// find the intersection point between the edge and the pb.
						
						// edge in slope intersect
						var A1 = e.b.z - e.a.z;
						var B1 = e.a.x - e.b.x;
						var C1 = A1 * e.a.x + B1 * e.a.z;

						var A2 = -pb.m;
						var B2 = 1;
						var C2 = pb.b;

						var det = A1 * B2 - A2 * B1;
						if (Math.abs(det) < 0.001) {
							// parallel lines
						} else {
							// add new point of intersection
							var x = (B2 * C1 - B1 * C2) / det;
               				var y = (A1 * C2 - A2 * C1) / det;
               				var intersection = new THREE.Vector3(x, 0, y);
							criticalPoints.push(intersection);

							// set closer point to intersection to clip
							if (distA < distB) {
								e.a = intersection;
							} else {
								e.b = intersection;
							}
						}
					}
					*/