const THREE = require('three')

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

function resetTransform(mesh) {
    mesh.updateMatrix();
    mesh.geometry.applyMatrix( mesh.matrix );
    mesh.position.set( 0, 0, 0 );
    mesh.rotation.set( 0, 0, 0 );
    mesh.scale.set( 1, 1, 1 );
    mesh.updateMatrix();
}

/*
	Suppose we are given a line defined by points A and B, 
	and a point P which we want to test. To do this we calculate 
	the cross product (P - A) x (B - A). If P would be to our 
	right as we walk along the vector from A to B, 
	this value will be positive. 
	If P would be to our left it will be negative. 
	If P is on the line AB then it will be zero.
	*/
var IsLeft = function(a, b, c) {
		
		return ((b.x - a.x)*(c.y - a.y) - (b.y - a.y)*(c.x - a.x)) > 0;
	};

	/*
	 * compute the convex hull for a set of points -
	 * order for the border of this Tile in clockwise.
	 * uses the gift wrapping algorithm!
	 */
var	computeConvexHull = function(points) {
		// compute random triangulation
		var triangulation = [];
		var edgeStack = [];
		
		// store the points in some random order
		var unordered = points.slice();

		// points is going to hold the points in order of their x values
		points.sort(function (a, b) {
			return a.x - b.x;
		});

		var i = 0;
		var currentPoint = points[0];
		var endpoint = unordered[0];
		var vertices = [];

		// finds the leftmost turn from this current point on the hull		
		do {
			vertices.push(currentPoint);
			endpoint = unordered[0];
			for (var j = 1; j < unordered.length; j++) {
				if ((endpoint === currentPoint) || 
					IsLeft(currentPoint, endpoint, unordered[j])) {
					endpoint = unordered[j];
				}
			}
			i++;
			currentPoint = endpoint;

		// prevents infinite loop
		} while (i < unordered.length * 2 && !(endpoint === vertices[0]));
		
		return vertices;
	};

/*
 * create a Tile for the voronoi cell with edge data.
 * to create the appearance of roads, 
 * the Tile is scaled down to leave empty space
 * for the agents to walk on.
 */
class Tile {
	constructor(points, scale, scene) {
		// create a Tile in three.js
		// pass in the points to the mesh constructor
		var geom = new THREE.Geometry();
		var midpoint = new THREE.Vector3(0, 0, 0);
		points.forEach(function (point) {
			geom.vertices.push(point.clone());
			midpoint.add(point.clone());
		}, this);

		midpoint.multiplyScalar(1 / points.length);
		
		var plane = new THREE.Plane(new THREE.Vector3(0, 5, 0), 0);

		// add faces with fan lmao
		for (var i = 1; i < points.length - 1; i++) {
			geom.faces.push(new THREE.Face3(0, i, i + 1));
		}

		// calculate midpoint
		var color = new THREE.Color().setRGB(0.1, 0.1, 0.1);
		var mesh = new THREE.Mesh(geom, 
			new THREE.MeshBasicMaterial({ 
				color: color, 
				side: THREE.DoubleSide, 
				wireframe: false }));

		// scale the Tile down
		// preserve the position of the mesh even when the mesh is scaled down
		let box = new THREE.Box3().setFromObject( mesh);
		let offset = box.getCenter();
		mesh.geometry.center();

		var r = Math.random() * (1.0 - scale);
		mesh.scale.set(scale + r, scale
			+ r, scale + r);
		mesh.position.set(offset.x, offset.y, offset.z);
		
		// make sure that the mesh geometry holds the actual vert values
		resetTransform(mesh);
		
		// add the Tile to the scene
		//scene.add (mesh);

		// rewrite the points
		
		this.points = [];
		mesh.geometry.vertices.forEach(function (v) {
			this.points.push(v.clone());
		}, this);

		//this.point = computeConvexHull(this.points);
		// must find convex hull of the points

		// rewrite the edges
		// edges is the edge of the actual cell.
		this.edges = [];
		for (var i = 0; i < this.points.length - 1; i++) {
			this.edges.push(new Edge(this.points[i].clone(), this.points[i + 1].clone()));
		}
		this.edges.push(new Edge(this.points[this.points.length - 1].clone(), this.points[0].clone()));

		// scale down one more time for the actual building lots
		// preserve the position of the mesh even when the mesh is scaled down
		box = new THREE.Box3().setFromObject( mesh);
		offset = box.getCenter();
		mesh.geometry.center();

		mesh.scale.x *= 0.8;
		mesh.scale.y *= 0.8;
		mesh.scale.z *= 0.8;
		mesh.position.set(offset.x, offset.y, offset.z);

		// // make sure that the mesh geometry holds the actual vert values
		resetTransform(mesh);

		// get the edges of the smaller boundary
		this.points = [];
		mesh.geometry.vertices.forEach(function (v) {
			this.points.push(v.clone());
		}, this);

		// rewrite the edges
		// edges is the edge of the actual cell.
		this.innerEdges = [];
		for (var i = 0; i < this.points.length - 1; i++) {
			this.innerEdges.push(new Edge(this.points[i].clone(), this.points[i + 1].clone()));
		}
		this.innerEdges.push(new Edge(this.points[this.points.length - 1].clone(), this.points[0].clone()));

		// // make sure that the mesh geometry holds the actual vert values
		//resetTransform(mesh);

		// get mesh edges
		
		// add the Tile to the scene
		mesh.position.z -= 0.01;
		scene.add (mesh);

		this.mesh = mesh;
		// store center
		this.midpoint = midpoint;
	}
}

class Edge {
	constructor(a, b) {
		this.a = a;
		this.b = b;
	}
}

/*
 * using the set of points, compute the voronoi cell for each point
 */
class Voronoi {
	constructor(points, scene, gridSize) {
		this.points = points;
		this.scene = scene;
		this.grid = [];
		this.dotGeos = [];
		this.convexHullGeos = [];
		this.convexHulls = [];
		this.tiles = [];
		this.tilesGrid = [];
		this.smallTiles = [];

		// draw the sites
		//this.drawDotGeometry(scene, points, new THREE.Color().setRGB(1, 0, 0), 0.02);
		
		// maps random points in a dictionary so they can be accessed by their voxel
		this.processPoints();

		// computes the cells for each random point
		//this.points.forEach(function (point) {
		for (var i = 0; i < this.points.length; i++) {
			var point = this.points[i];
		 	var x = Math.floor(point.x);
		 	var y = Math.floor(point.y);

		 	// remove gross "edge" cases
		 	if (x > -gridSize / 2 && x <  gridSize / 2 - 1 &&
		 		y > -gridSize / 2 && y < gridSize / 2 - 1 
		 		//x == 0 && y == 0) {
		 		) {
		 		var ch = this.computeCell(Math.floor(point.x), 
		 			Math.floor(point.y), 
		 			new THREE.Color().setRGB(Math.random() + 0.2, 
		 				Math.random() + 0.2, Math.random() + 0.2));
		 		this.convexHulls.push(ch);
		 		var tile = new Tile(ch, 0.8, scene);
		 		this.tiles.push(tile);
		 		var row = this.tilesGrid[x];
		 		this.tilesGrid[x] = row === undefined ? [] : row;
		 		this.tilesGrid[x][y] = tile;
		 	} 
		 }	
	}

	/*
	 * maps the points to their voxels in this.grid
	 */
	processPoints() {
		this.points.forEach(function (point) {
			if (this.grid[Math.floor(point.x)] == undefined) this.grid[Math.floor(point.x)] = [];
			this.grid[Math.floor(point.x)][Math.floor(point.y)] = point;
		}, this);
	}

	/*
	 * draws a set of points
	 */
	drawDotGeometry(scene, points, color, size) {
		var colors = [];
		var dotGeometry = new THREE.Geometry();
		points.forEach(function (point) {
			dotGeometry.vertices.push(point);
			colors.push(color.clone());
		}, this);

		dotGeometry.colors = colors;
		var dotMaterial = new THREE.PointsMaterial( {size: size, vertexColors: THREE.VertexColors} );

		// store just in case we wanna remove
		this.dotGeos.push(dots);
		var dots = new THREE.Points(dotGeometry, dotMaterial);
		scene.add (dots);
	}

	/*
	 * returns the convex hull (set of points that outline the cell)
	 *
	 * Algorithm: find the perpendicular bisectors between the site and all the neighbors.
	 * Find the intersections between every single pair of perpendicular bisectors.
	 * Find the intersections between the vectors to the neighbors from the site and the perpendicular bisectors.
	 * The closest perpendicular bisector contains the segment that constitutes the wall for the cell.
	 * Sort the points of intersections on a perpendicular bisector with the other bisectors by x.
	 * Iterate over these points of intersection in order to find the segment that the "normal" intersects with.
	 * The points of these segments are the corners of the cells.
	 * Use the gift wrapping algorithm to sort the points for the Tile in clockwise order.
 	 */
	computeCell(x, y, color) {
		// check cells in 6x6 surrounding and collect them
		// calculate the perpendicular bisectors for each of the neighbors
		var neighbors = [];
		var pbs = [];
		var offset = 3;
		var point = this.grid[x][y];
		for (var i = -offset; i <= offset; i++) {
			for (var j = -offset; j <= offset; j++) {
				if (this.grid[x + i] !== undefined) {
					var row = this.grid[x + i];
					if (row[y + j] !== undefined) {
						if (!(i == 0 && j == 0))  {
							neighbors.push(row[y + j]);
							
// UNCOMMENT TO VISUALIZE THE NEIGHBORS / NORMALS
							// var geometry = new THREE.Geometry();
							// var material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
							// geometry.vertices.push(row[y + j]);
							// geometry.vertices.push(point);
							// var line = new THREE.Line(geometry, material);
							// this.edgeGeo.push(line);
							// this.scene.add(line);

							var pb = new HalfPlane(row[y + j], this.grid[x][y]);

// UNCOMMENT THIS IF YOU WANNA DRAW THE PBS
							//pb.draw(this.scene);
							pbs.push(pb);
						}
					} 
				} 
			}
		}

		// holds all the intersections between all the pbs in the scene
		var intersections = [];

		// slice the pbs into segments according to their intersections with other pbs
		for (var i = 0; i < pbs.length; i++) {
			for (var j = i + 1; j < pbs.length; j++) {
				var isect = pbs[i].getIntersection(pbs[j]);
				
				// store the intersections in the pbs
				if (isect !== undefined) {
					pbs[i].intersections.push(isect);
					pbs[j].intersections.push(isect);
					intersections.push(isect);
				}
			}
		}

		// sort the pb-pb intersections along the lines by x coordinate
		pbs.forEach(function (pb) {
			pb.intersections.sort(function (a, b) {
				return a.x - b.x;
			})

// UNCOMMENT TO VISUALIZE THE INTERSECTIONS FOR THIS PB
			//pb.drawIntersections(new THREE.Color().setRGB(1, 0, 0), this.scene, 0.2);
		}, this);
		
		var closestIntersections = []; // closest intersections for all neighbors
		var closestGeo = []; // holds the dot geometry

		// wrapper to hold the normal-pb intersections and the pbs
		var PBIntersection = function(pb, intersection) {
			this.pb = pb;
			this.intersection = intersection;
		};
		
		// for each neighbor, perform an "intersection feeler" test
		// essentially, test for intersections for the normals, 
		// and try to compute the closest segment.
		// the closest segment that a normal intersects with is the cell border for the voronoi.
		neighbors.forEach(function (neighbor) {
			var neighborIntersections = [];
			pbs.forEach(function (pb) {
				var isect = pb.getIntersectionWithNormal(point, neighbor);
				if (isect !== undefined) {
					neighborIntersections.push(new PBIntersection(pb, isect));
				}
			}, this);

			
			// find the closest intersection with a pb for this neighbor normal
			var toNeighbor = new THREE.Vector3().subVectors(neighbor, point);
			var minimum = neighborIntersections[0];
			var minDistance = minimum.intersection.distanceTo(point);
			for (var i = 0; i < neighborIntersections.length; i++) {
				var isect = neighborIntersections[i].intersection;
				var toIntersection = new THREE.Vector3().subVectors(isect, point);
				var distance = isect.distanceTo(point);
				
				// test if the closest intersection is in the same direction as the ray
				// filter out the intersections that are "behind" the normal
				if (distance < minDistance && toNeighbor.dot(toIntersection) > 0) {
					minimum = neighborIntersections[i];
					minDistance = distance;
				}
			}

			// keep only the closest intersections
			closestIntersections.push(minimum);
			closestGeo.push(minimum.intersection);
		}, this);

// UNCOMMENT TO DRAW THE CLOSEST INTERSECTIONS WITH THE NEIGHBOR NORMALS
		//this.drawDotGeometry(this.scene, closestGeo, new THREE.Color().setRGB(0.3, 0.3, 1), 0.1);

		// find the segments along the pb for the points and all them to the convex hull
		// remember that the segments are sorted along x.
		// the segment for this edge against this neighbor is the one where the intersection with the normal
		// lies between.
		var segmentPoints = [];
		closestIntersections.forEach(function (pbIsect) {
			var pb = pbIsect.pb;
			var isect = pbIsect.intersection;
			for (var i = 1; i < pb.intersections.length; i++) {
				if (isect.x < pb.intersections[i].x) {
					segmentPoints.push(pb.intersections[i - 1]);
					segmentPoints.push(pb.intersections[i]);
					break;
				}
			}
		});

		// draw the endpoints for these segments
// UNCOMMENT TO DRAW THE CORNERS OF THE CELLS
		//this.drawDotGeometry(this.scene, segmentPoints, new THREE.Color().setRGB(0.3, 0.3, 1), 0.1);

		// essentially sorts the points passed in to get the order drawing the Tile
		var convexHull = computeConvexHull(segmentPoints);
		
// UNCOMMENT TO DRAW THE CONVEX HULLS
		this.drawConvexHull(this.scene, convexHull, color);

		return convexHull;

// UNCOMMENT TO DRAW ALL THE INTERSECTIONS WITH EACH OF THE PBS
		//this.drawDotGeometry(this.scene, intersections, new THREE.Color().setRGB(1, 0, 1), 0.1);
	}

	/*
	 * draw the Tile created by these points stored in "convex hull"
	 */
	drawConvexHull(scene, convexHull, color) {
		//if (this.convexHullGeos.length == 0) {
			var lines = [];
		for (var i = 0; i < convexHull.length - 1; i++) {
			var geom = new THREE.Geometry();
			geom.vertices.push(convexHull[i]);
			geom.vertices.push(convexHull[i + 1]);
			geom.computeLineDistances();
			var material = new THREE.LineDashedMaterial( {
				color: 0xffffff,
				linewidth: 1,
				dashSize: 0.01,
				gapSize: 0.01,
			} );
			var line = new THREE.Line(geom, material);
			//line.computeLineDistances();
			lines.push(line);
			scene.add(line);
		}

		// add another line for the last point to the start point, close the Tile
		var geom = new THREE.Geometry();
		geom.vertices.push(convexHull[convexHull.length - 1]);
		geom.vertices.push(convexHull[0]);
		geom.computeLineDistances();
		var material = new THREE.LineDashedMaterial( {
			color: 0xffffff,
			linewidth: 1,
			dashSize: .01,
			gapSize: .01,
		} );
		//var material = new THREE.LineBasicMaterial( { color: color });
		var line = new THREE.Line(geom, material);

		lines.push(line);
		scene.add(line);

		// store the convex hull just in case we want to remove this geometry
		this.convexHullGeos.push(lines);
		//}
		
	}
}

/*
 * computes the perpendicular bisector for two points
 */
class HalfPlane {
	constructor(a, b) {
		// holds the points that this plane bisects
		this.p1 = a;
		this.p2 = b;

		// stores the intersections between this and all other half planes
		this.intersections = [];
		this.isectGeo;

		// calculate the midpoint between points a and b
		var midpoint = (new THREE.Vector3()).addVectors(a, b);
		midpoint.multiplyScalar(0.5);
		this.midpoint = midpoint;
		
		// calculates the slope of the perpendicular bisector with the negative recip
		var slope = (b.y - a.y) / (b.x - a.x);
		var negRecip = -(1 / slope);
		
		this.b = midpoint.y - negRecip * midpoint.x;
		this.m = negRecip;

		this.lineGeo;
	}

	/*
	 * generates a long line segment using the point slope formula
	 * returns the left most point
	 */
	createLeftPoint(length) {
		return new THREE.Vector3(-length, -length * this.m + this.b, 0);
	}

	/*
	 * generates a long line segment using the point slope formula
	 * returns the right most point
	 */
	createRightPoint(length) {
		return new THREE.Vector3(length, length * this.m + this.b, 0);
	}

	/*
	 * draws a green line to represent the perpendicular bisector for debugging
	 */
	draw(scene) {
		var a = this.createLeftPoint(20);
		var b = this.createRightPoint(20)

		var geometry = new THREE.Geometry();
		var material = new THREE.LineBasicMaterial({ color: 0xffff00 });
		geometry.vertices.push(a);
		geometry.vertices.push(b);
		
		var line = new THREE.Line(geometry, material);
		this.lineGeo = line;
		
		scene.add(line);
	}

	/*
	 * draws all the intersections with this pb and other pbs
	 * colors them in order along the x-axis
	 * do not use blue as the initial color!
	 */
	drawIntersections(color, scene, size) {
		var colors = [];
		var dotGeometry = new THREE.Geometry();

		// amount the color adds blue to the current color
		var colorOffset = 0.0;
		var interval = 1.0 / this.intersections.length;

		// adds each intersection, coloring them according to their order
		this.intersections.forEach(function (point) {
			dotGeometry.vertices.push(point);
			var c = color.clone();
			c.setRGB(c.r, c.g, c.b + colorOffset);
			colors.push(c);
			colorOffset += interval;
		}, this);

		dotGeometry.colors = colors;
		var dotMaterial = new THREE.PointsMaterial( {size: size, vertexColors: THREE.VertexColors} );

		var dots = new THREE.Points(dotGeometry, dotMaterial);
		this.isectGeo = dots;
		scene.add (dots);
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
			var intersection = new THREE.Vector3(x, y, 0);
			return intersection;
		}
	}

	/*
	 * returns the intersection between this and the other pb
	 * important: returns undefined if there is no intersection
	 */
	getIntersection(other) {
		var e0 = this.createLeftPoint(20);
		var e1 = this.createRightPoint(20);
		var o0 = other.createLeftPoint(20);
		var o1 = other.createRightPoint(20);

		return this.intersectionTest(e0, e1, o0, o1);
	}

	/*
	 * returns the intersection between this and 
	 * a normal (line from the site to a neighbor)
	 * important: returns undefined if there is no intersection
	 */
	getIntersectionWithNormal(normalStart, normalEnd) {
		var e0 = this.createLeftPoint(20);
		var e1 = this.createRightPoint(20);
		var o0 = normalStart;
		var o1 = normalEnd;

		return this.intersectionTest(e0, e1, o0, o1);
	}
}

export default {
	Voronoi: Voronoi,
	Edge: Edge,
	Tile: Tile,
	HalfPlane: HalfPlane,
	computeConvexHull: computeConvexHull,
	resetTransform: resetTransform
}