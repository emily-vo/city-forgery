const THREE = require('three');
class HalfPlane {
	constructor(a, b) {
		var midpoint = (new THREE.Vector3()).addVectors(a, b);
		midpoint.multiplyScalar(0.5);
		var slope = (b.y - a.y) / (b.x - a.x);
		var negRecip = -(1 / slope);
		this.b = midpoint.y - negRecip * midpoint.x;
		this.m = negRecip;
		this.intersections = [];
		//this.b = b;
		this.midpoint = midpoint;
		this.p1 = a;
		this.p2 = b;
	}

	draw(scene) {
		// x = t
		// y = mt + b
		// find a (t = -100)
		var a = new THREE.Vector3(-20, -20 * this.m + this.b, 0);
		// find b (t = 100)
		var b = new THREE.Vector3(20, 20 * this.m + this.b, 0);

		// use green
		var geometry = new THREE.Geometry();
		var material = new THREE.LineBasicMaterial({ color: 0xffff00, weight: 2 });
		geometry.vertices.push(a);
		geometry.vertices.push(b);
		var line = new THREE.Line(geometry, material);
		//this.edgeGeo.push(line);
		scene.add(line);
	}

	drawIntersections(color, scene, size) {
		var colors = [];
		var dotGeometry = new THREE.Geometry();
		var colorOffset = 0.0;
		var interval = 1.0 / this.intersections.length;
		this.intersections.forEach(function (point) {
			dotGeometry.vertices.push(point);
			var c = color.clone();
			c.setRGB(c.r, c.g, c.b + colorOffset);
			colors.push(c);
			colorOffset += interval;
		}, this);

		//console.log(dotGeometry);
		// create the site geometry and set up the scene
		dotGeometry.colors = colors;
		var dotMaterial = new THREE.PointsMaterial( {size: size, vertexColors: THREE.VertexColors} );

		var dots = new THREE.Points(dotGeometry, dotMaterial);
		scene.add (dots);
	}

	getIntersection(other) {
		var e0 = new THREE.Vector3(-20, -20 * this.m + this.b, 0);
		var e1  = new THREE.Vector3(20, 20 * this.m + this.b, 0);
		var o0 = new THREE.Vector3(-20, -20 * other.m + other.b, 0);
		var o1 = new THREE.Vector3(20, 20 * other.m + other.b, 0);

		//var A1 = e.b.z - e.a.z;
		var A1 = e1.y - e0.y;
		//var B1 = e.a.x - e.b.x;
		var B1 = e0.x - e1.x;
		//var C1 = A1 * e.a.x + B1 * e.a.z;
		var C1 = A1 * e0.x + B1 * e0.y;
		
		var A2 = o1.y - o0.y;
		var B2 = o0.x - o1.x;
		var C2 = A2 * o0.x + B2 * o0.y;

		var det = A1 * B2 - A2 * B1;
		if (Math.abs(det) < 0.001) {
			// parallel lines
			return undefined;
		} else { // if e intersects pb
			// add new point of intersection
			var x = (B2 * C1 - B1 * C2) / det;
			var y = (A1 * C2 - A2 * C1) / det;
			var intersection = new THREE.Vector3(x, y, 0);
			return intersection;
		}
	}

	getIntersectionNormal(normalStart, normalEnd) {
		var e0 = new THREE.Vector3(-20, -20 * this.m + this.b, 0);
		var e1  = new THREE.Vector3(20, 20 * this.m + this.b, 0);
		var o0 = normalStart;
		var o1 = normalEnd;

		//var A1 = e.b.z - e.a.z;
		var A1 = e1.y - e0.y;
		//var B1 = e.a.x - e.b.x;
		var B1 = e0.x - e1.x;
		//var C1 = A1 * e.a.x + B1 * e.a.z;
		var C1 = A1 * e0.x + B1 * e0.y;
		
		var A2 = o1.y - o0.y;
		var B2 = o0.x - o1.x;
		var C2 = A2 * o0.x + B2 * o0.y;

		var det = A1 * B2 - A2 * B1;
		if (Math.abs(det) < 0.001) {
			// parallel lines
			return undefined;
		} else { // if e intersects pb
			// add new point of intersection
			var x = (B2 * C1 - B1 * C2) / det;
			var y = (A1 * C2 - A2 * C1) / det;
			var intersection = new THREE.Vector3(x, y, 0);
			return intersection;
		}
	}
}

class SimpleVoronoi {
	constructor(points, scene) {
		this.points = points;
		this.scene = scene;
		this.grid = [];
		//this.colors = [];
		this.drawDotGeometry(scene, points, new THREE.Color().setRGB(1, 0, 0), 0.02);
		this.processPoints();
		//console.log(this.grid);
		//this.computeCell(Math.floor(Math.random() * 5 - 2.5), Math.floor(Math.random() * 5 - 2.5));
		
		 this.points.forEach(function (point) {
		 	this.computeCell(Math.floor(point.x), Math.floor(point.y), new THREE.Color().setRGB(Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2))
		 }, this);
	}

	processPoints() {
		this.points.forEach(function (point) {
			if (this.grid[Math.floor(point.x)] == undefined) this.grid[Math.floor(point.x)] = [];
			this.grid[Math.floor(point.x)][Math.floor(point.y)] = point;
		}, this);
	}

	drawDotGeometry(scene, points, color, size) {
		var colors = [];
		var dotGeometry = new THREE.Geometry();
		points.forEach(function (point) {
			dotGeometry.vertices.push(point);
			colors.push(color.clone());
		}, this);

		//console.log(dotGeometry);
		// create the site geometry and set up the scene
		dotGeometry.colors = colors;
		var dotMaterial = new THREE.PointsMaterial( {size: size, vertexColors: THREE.VertexColors} );

		var dots = new THREE.Points(dotGeometry, dotMaterial);
		scene.add (dots);
	}

	computeCell(x, y, color) {
		// check cells in 3x3 surrounding and collect them
		var neighbors = [];
		var pbs = [];
		var count = 0;
		var offset = 3;
		var point = this.grid[x][y];
		for (var i = -offset; i <= offset; i++) {
			for (var j = -offset; j <= offset; j++) {
				if (this.grid[x + i] !== undefined) {
					count++;
					var row = this.grid[x + i];
					if (row[y + j] !== undefined) {
						if (!(i == 0 && j == 0))  {
							neighbors.push(row[y + j]);
							var geometry = new THREE.Geometry();
							var material = new THREE.LineBasicMaterial({ color: 0x00ff00, weight: 2 });
							geometry.vertices.push(row[y + j]);
							geometry.vertices.push(point);
							var line = new THREE.Line(geometry, material);
							//this.edgeGeo.push(line);
							//this.scene.add(line);

							var pb = new HalfPlane(row[y + j], this.grid[x][y]);
							//pb.draw(this.scene);
							pbs.push(pb);
						}
					} 
				} 
			}
		}

		var intersections = [];


		// slice the pbs into segements
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

		// sort the intersections along the lines
		pbs.forEach(function (pb) {
			pb.intersections.sort(function (a, b) {
				return a.x - b.x;
			})
			// draw the points
			//pb.drawIntersections(new THREE.Color().setRGB(1, 0, 0), this.scene, 0.2);
		}, this);
		
		var closestIntersections = [];
		var closestGeo = [];
		//var allIntersections = [];
		var PBIntersection = function(pb, intersection) {
			this.pb = pb;
			this.intersection = intersection;
		};
		// record the pb that this intersection belongs with
		neighbors.forEach(function (neighbor) {
			var neighborIntersections = [];
			pbs.forEach(function (pb) {
				var isect = pb.getIntersectionNormal(point, neighbor);
				if (isect !== undefined) {
					neighborIntersections.push(new PBIntersection(pb, isect));
					//closestGeo.push(isect);
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
				if (distance < minDistance && toNeighbor.dot(toIntersection) > 0) {
					minimum = neighborIntersections[i];
					minDistance = distance;
				}
			}

			closestIntersections.push(minimum);
			closestGeo.push(minimum.intersection);
		}, this);

		//this.drawDotGeometry(this.scene, closestGeo, new THREE.Color().setRGB(0.3, 0.3, 1), 0.1);

		// find the segments along the pb for the points
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

		// remove points that are closer to neighbors ??? wtf 
		// console.log("segments");
		// console.log(segmentPoints)
		segmentPoints = segmentPoints.filter(function (p) {
			neighbors.forEach(function(n) {
				if (p.distanceTo(point) > p.distanceTo(n) ) {
					return false;
					console.log("far")
				}
			}, this);
			return true;
		}, this);
		//console.log(segmentPoints)
		//segmentPoints.push(point)
		this.drawDotGeometry(this.scene, segmentPoints, new THREE.Color().setRGB(0.3, 0.3, 1), 0.1);
		var convexHull = this.computeConvexHull(segmentPoints);
		this.drawConvexHull(this.scene, convexHull, color);
		//this.drawDotGeometry(this.scene, intersections, new THREE.Color().setRGB(1, 0, 1), 0.1);
	}

	IsLeft(a, b, c) {
		/*
		Suppose we are given a line defined by points A and B, 
		and a point P which we want to test. To do this we calculate 
		the cross product (P - A) x (B - A). If P would be to our 
		right as we walk along the vector from A to B, 
		this value will be positive. 
		If P would be to our left it will be negative. 
		If P is on the line AB then it will be zero.
		*/
		//console.log(a);
		//console.log(b);
		//console.log(p);
		return ((b.x - a.x)*(c.y - a.y) - (b.y - a.y)*(c.x - a.x)) > 0;
	}

	computeConvexHull (points) {
		// compute random triangulation
		var triangulation = [];
		var edgeStack = [];
		
		// compute arbitrary triangulation using gift wrapping algorithm
		// compute convex hull
		console.log(points)
		var unordered = points.slice();
		//console.log(unordered)
		points.sort(function (a, b) {
			return a.x - b.x;
		});
		var i = 0;
		var currentPoint = points[0];
		var endpoint = unordered[0];
		var vertices =[];		
		do {
			vertices.push(currentPoint);
			endpoint = unordered[0];
			//var idx = 0;
			for (var j = 1; j < unordered.length; j++) {
				// console.log(currentPoint)
				// console.log(endpoint)
				// console.log(unordered[j])
				// console.log(j)
				// console.log(unordered)
				if ((endpoint === currentPoint) || 
					this.IsLeft(currentPoint, endpoint, unordered[j])) {
					endpoint = unordered[j];
					//console.log(true)
				}
			}
			i++;
			currentPoint = endpoint;
			//console.log(endpoint)
		} while (i < unordered.length * 2 && !(endpoint === vertices[0]));
		
		//if(unordered.length != vertices.length)
			//console.log("Convex hull vertex sort did not work: " + unordered.length + " original points, result: " + vertices.length)
		//console.log(vertices)
		return vertices;
	}

	drawConvexHull(scene, convexHull, color) {
		for (var i = 0; i < convexHull.length - 1; i++) {
			var geom = new THREE.Geometry();
			geom.vertices.push(convexHull[i]);
			geom.vertices.push(convexHull[i + 1]);
			var material = new THREE.LineBasicMaterial( { color: color });
			var line = new THREE.Line(geom, material);
			scene.add(line);
		}

		var geom = new THREE.Geometry();
		geom.vertices.push(convexHull[convexHull.length - 1]);
		geom.vertices.push(convexHull[0]);
		var material = new THREE.LineBasicMaterial( { color: color });
		var line = new THREE.Line(geom, material);
		scene.add(line);

	}
}

export default {
	SimpleVoronoi: SimpleVoronoi
}