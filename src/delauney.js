const THREE = require('three');
import MapData from './mapdata.js'
class TriWrapper {
	constructor(triangle) {
		this.triangle = triangle;
		this.good = true;
	}
}

class Delauney {
	constructor(points, scene) {
		this.triangulation = [];
		this.points = points;
		this.colors = [];
		//this.BoywerWaterson(points);
		this.convexHull;
		this.computeConvexHull(points);
		this.fan();
		this.divideTriangles();
		//this.BoywerWaterson(points);
		//

		//this.drawConvexHull(scene);
		//this.drawTriangulation(scene);

		//this.FlipAlgorithm(points);

		//this.BoywerWaterson(points);
		//this.drawDotGeometry(scene);
		//this.drawTriangulation(scene);
	}

	// assume triangle abc is counterclockwise
	// test if a point d is in the circumcircle of abc
	inCircle(a, b, c, d) {
		var m = new THREE.Matrix4();
		m.elements = [1, a.x, a.y, a.x * a.x + a.y * a.y,
					  1, b.x, b.y, b.x * b.x + b.y * b.y,
					  1, c.x, c.y, c.x * c.x + c.y * c.y,
					  1, d.x, d.y, d.x * d.x + d.y * d.y];
		return m.determinant();
	}

	// barycentric coordinate test
	inTriangle(a, b, c, d) {
		var P0P1 = (new THREE.Vector3()).subVectors(a, b);
		var P0P2 = (new THREE.Vector3()).subVectors(a, c);
		var PP0 = (new THREE.Vector3()).subVectors(d, a);
		var PP1 = (new THREE.Vector3()).subVectors(d, b);
		var PP2 = (new THREE.Vector3()).subVectors(d, c);
		var S = ((new THREE.Vector3()).crossVectors(P0P1, P0P2)).length() * 0.5;
		var s1 = 0.5 * (new THREE.Vector3().crossVectors(PP1, PP2)).length() / S;
		var s2 = 0.5 * (new THREE.Vector3().crossVectors(PP2, PP0)).length() / S;
		var s3 = 0.5 * (new THREE.Vector3().crossVectors(PP0, PP1)).length() / S;
		var sum = s1 + s2 + s3;
		//console.log(sum)
		//console.log(S)
		return s1 >= 0 && s1 <= 1 && s2 >= 0 && s2 <= 1 && s3 >= 0 && s3 <= 1 && Math.abs(sum - 1.0) < 0.001;
	}	

	// orientation of a tetrahedron abcd (abd, bcd triangles)
	// orientation of ab, ac, ad > 0
	orientation(a, b, c, d) {
		var m = new THREE.Matrix4();
		m.elements = [1, a.x, a.z,
					  1, b.x, b.z, b.x * b.x + b.z * b.z,
					  1, c.x, c.z, c.x * c.x + c.z * c.z,
					  1, d.x, d.z, d.x * d.x + d.z * d.z];
		return m.determinant();
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
	
	computeConvexHull (pointList) {
		//var pointsClone = pointList.slice();
		// compute random triangulation
		var triangulation = [];
		var edgeStack = [];
		
		// compute arbitrary triangulation using gift wrapping algorithm
		// compute convex hull
		var unordered = pointList.slice();
		console.log(unordered)
		pointList.sort(function (a, b) {
			return a.x - b.x;
		});
		var i = 0;
		var currentPoint = pointList[0];
		var endpoint = unordered[0];
		var vertices =[];		
		do {
			vertices.push(currentPoint);
			endpoint = unordered[0];
			//var idx = 0;
			for (var j = 1; j < unordered.length; j++) {
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
		
		if(unordered.length != vertices.length)
			console.log("Convex hull vertex sort did not work: " + unordered.length + " original points, result: " + vertices.length)

		this.convexHull = vertices;
	}

	fan() {
		for (var i = 1; i < this.convexHull.length - 1; i++) {
			this.triangulation.push(new TriWrapper(
				new THREE.Triangle(
					this.convexHull[0], 
					this.convexHull[i], 
					this.convexHull[i + 1])));
		}
	}

	divideTriangles() {
		var q = this.points.slice();
		console.log(q);
		q = q.filter(function (point) {
			return this.convexHull.indexOf(point) < 0;
		}, this);
		console.log(q);
		this.triangulation.forEach( function (triWrapper) {
			q.forEach( function (point) {
				var tri = triWrapper.triangle;
				if (this.inTriangle(tri.a, tri.b, tri.c, point)) {
					triWrapper.good = false;
					console.log("in triangle!");
					// create triangle to each of these edges
					var edges = [['a', 'b'], ['b', 'c'],
									['c', 'a']];
					//console.log(tri);
					edges.forEach(function (edge) {
						//console.log(edge);
						//console.log(tri[edge[0]])
						var newTri = new THREE.Triangle(tri[edge[0]], tri[edge[1]], point);
						this.triangulation.push(new TriWrapper(newTri));
					}, this);
				}	
			}, this);
		}, this);

		this.triangulation = this.triangulation.filter( triWrapper => triWrapper.good );
		this.FlipAlgorithm();
	}

	FlipAlgorithm() {
		var edgeStack = [];
		var Edge = function (a, b) {
			this.a = a;
			this.b = b;
		}
		// create a stack of edges
		var containsEdge = function (edge, edgeList) {
			for (var i = 0; i  < edgeStack.length; i++) {
				if (edgeStack[i].a === edge.a && edgeStack[i].b === edge.b) return true;
			}
			return false;
		}

		// find the illegal edges and their corresponding triangles


		this.triangulation.forEach(function (triWrapper) {
			var tri = triWrapper.triangle;
			var edges = [['a', 'b'], ['b', 'c'],
									['c', 'a']];
				edges.forEach(function (e) { 
					var edge = new Edge(tri[e[0]], tri[e[1]]);
					if (!containsEdge(edge, edgeStack)) {
						edgeStack.push(edge);
					}
				}, this);
		}, this);
		//console.log(this.triangulation);
		//console.log(edgeStack);

		var length = edgeStack.length;
		while (length > 0) {
			var ab = edgeStack.splice(length - 1);
			//console.log(ab);
			length--;


		}
		// this.triangulation.forEach(function (triWrapper) {
		// 	var tri = triWrapper.triangle;
		// 	this.triangulation.forEach(function (otherWrapper) {
		// 		var otherTri = otherWrapper.triangle;
		// 		var edges = [['a', 'b'], ['b', 'c'],
		// 							['c', 'a']];
		// 		edges.forEach(function (edge) {
		// 			if (this.checkEdge(tri[edge[0]], tri[edge[1]], otherTri)) {
		// 				console.log("shared edge!");
		// 				// these two triangles form a quadrilateral

		// 			}
		// 		}, this);
		// 	}, this);
		// }, this);
	}
	ifIllegal(edge) {
	}
	checkIntersections() {
		this.triangulation.forEach(function (triWrapper) {
			var tri = triWrapper.triangle;
			this.triangulation.forEach(function (otherWrapper) {
				var otherTri = otherWrapper.triangle;
				var edges = [['a', 'b'], ['b', 'c'],
									['c', 'a']];
				edges.forEach(function (edge) {
					var e0 = tri[edge[0]];
					var e1 = tri[edge[1]];
					edges.forEach(function (otherEdge) {
						var o0 = otherTri[otherEdge[0]];
						var o1 = otherTri[otherEdge[1]];

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
						} else { // if e intersects pb
							// add new point of intersection
							var x = (B2 * C1 - B1 * C2) / det;
	           				var y = (A1 * C2 - A2 * C1) / det;
	           				//var intersection = new THREE.Vector3(x, 0, y);
	           				//console.log(intersection);
	           				if (this.onLineSegment(x, y, e0, e1) && this.onLineSegment(x, y, o0, o1)) {
	           					console.log("intersection found");
	           				}
						}

					}, this);
				}, this);
			}, this);
		}, this);
	}

	onLineSegment(x, y, p1x, p1y, p2x, p2y) {
		//if (x == Infinity || y == Infinity) return false;
		return x >= Math.min(p1x, p2x) && 
			x <= Math.max(p1x, p2x) &&
			y >= Math.min(p1y, p2y) &&
			y <= Math.max(p1y, p2y);

	}

	drawDotGeometry(scene) {
		var dotGeometry = new THREE.Geometry();
		this.points.forEach(function (point) {
			dotGeometry.vertices.push(point);
			var color = new THREE.Color();
			color.setRGB(1, 0, 0);
			this.colors.push(color);
		}, this);

		console.log(dotGeometry);
		// create the site geometry and set up the scene
		dotGeometry.colors = this.colors;
		var dotMaterial = new THREE.PointsMaterial( {size: 0.05, vertexColors: THREE.VertexColors} );

		var dots = new THREE.Points(dotGeometry, dotMaterial);
		scene.add (dots);
	}

	drawConvexHull(scene) {
		for (var i = 0; i < this.convexHull.length - 1; i++) {
			var geom = new THREE.Geometry();
			geom.vertices.push(this.convexHull[i]);
			geom.vertices.push(this.convexHull[i + 1]);
			var material = new THREE.LineBasicMaterial( { color: 0x00ff00 });
			var line = new THREE.Line(geom, material);
			scene.add(line);
		}
	}

	BoywerWaterson(pointList) {
		var triangulation = [];
		// get the super triangle
		var min = new THREE.Vector3(Infinity, Infinity, 0);
		var max = new THREE.Vector3(-Infinity, -Infinity, 0);
		
		pointList.forEach(function (point) {
			if (point.x < min.x) min.x = point.x;
			if (point.y < min.y) min.y = point.y;
			if (point.z < min.z) min.z = point.z;
		}, this);

		pointList.forEach(function (point) {
			if (point.x > max.x) max.x = point.x;
			if (point.y > max.y) max.y = point.y;
			if (point.z > max.z) max.z = point.z;
		}, this);

		var bbXMin = 4 * min.x - max.x;
		var bbXMax = 4 * max.x - min.x;
		var bbYMin = 4 * min.y - max.y;
		var bbYMax = 4 * max.y - min.y;

		var v0 = new THREE.Vector3(bbXMin, bbYMin, 0);
		var v1 = new THREE.Vector3(0, bbYMax, 0);
		var v2 = new THREE.Vector3(bbXMax, bbYMin, 0);
		var v3 = new THREE.Vector3(bbXMax, bbYMax, 0);

		//v0 = new THREE.Vector3(-100, 0, -100);
		//v1 = new THREE.Vector3(0, 0, 100);
		//v2 = new THREE.Vector3(100, 0, -100);

		this.triangulation.push(new TriWrapper(new THREE.Triangle(v0, v1, v2)));
		//this.triangulation.push(new TriWrapper(new THREE.Triangle(v1, v2, v3)));

		var superTriangles = [v0, v1, v2, v3];
		// add all the points one at a time to the triangulation

		pointList.forEach(function(point) {
			var badTriangles = [];
			this.triangulation.forEach(function (triWrapper) {
				var triangle = triWrapper.triangle;
				//console.log(triangle);
				console.log(this.inCircle(triangle.a, triangle.b, triangle.c, point));
				// if point is inside circumcircle of triangle, add triangle to bad
				if (this.inCircle(triangle.a, triangle.b, triangle.c, point) < 0) {
					
					badTriangles.push(triangle);
					triWrapper.good = false;
					console.log("bad");
				}
			}, this);
			var polygon = [];

			// find the polygon hole
			badTriangles.forEach(function (triangle) {
				// if there is an edge not shared by the other triangles, add it to polygons
				var edges = [['a', 'b'], ['b', 'c'],
								['c', 'a']];
				edges.forEach(function (edge) {
					var unshared = true;
					badTriangles.forEach(function(otherTriangle) {
						unshared = unshared && !this.checkEdge(triangle[edge[0]], triangle[edge[1]], otherTriangle); 
					}, this);
					if (unshared) {
						polygon.push([triangle[edge[0]], triangle[edge[1]]]);
					}
				}, this);
			}, this);
			console.log(polygon);
			this.triangulation = this.triangulation.filter( triWrapper => triWrapper.good );
			polygon.forEach(function (edge) {
				var newTri = new THREE.Triangle(edge[0], edge[1], point);
				console.log(newTri);
				triangulation.push(new TriWrapper(newTri)); // create new triangles from edge to point
			});
		}, this);
		
		//clean up triangulation
		this.triangulation.forEach(function (triWrapper) {
			var tri = triWrapper.triangle;
			superTriangles.forEach(function (vertex) {
				if (tri.containsPoint(vertex)) {
					triWrapper.good = false;
					//console.log("shared point");
				} 
			}, this);
		}, this);
		//this.triangulation = this.triangulation.filter( triWrapper => triWrapper.good );
		

		//this.triangulation = triangulation;
	}


	checkEdge(a, b, otherTriangle) {
		return otherTriangle.containsPoint(a) && otherTriangle.containsPoint(b);
	}

	drawTriangulation(scene) {
		console.log(this.triangulation);
		this.triangulation.forEach(function (triWrapper) {
			var triangle = triWrapper.triangle;
			var geom = new THREE.Geometry();
			geom.vertices.push(triangle.a);
			geom.vertices.push(triangle.b);
			geom.vertices.push(triangle.c);
			geom.faces.push(new THREE.Face3(0, 1, 2));
			geom.computeFaceNormals();
			var tri = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({color: 0x00ff00, side: THREE.DoubleSide, wireframe: true}));
			//console.log(tri)
			scene.add(tri);
		}, this);
	}
}



export default {
	Delauney: Delauney
}