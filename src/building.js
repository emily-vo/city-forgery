const THREE = require('three'); 
const ThreeCSG = require('three-js-csg')(THREE);
import Voronoi from './voronoi.js' // use the convex hull here
var nPoly = function (count) {
	var geo = new THREE.Geometry();
	var r = 0.5;
	for ( var i = 0; i < count; i ++ ) {
	    var a = 2 * i / count * Math.PI;
	    geo.vertices.push( new THREE.Vector3 ( Math.cos( a ) * r, Math.sin( a ) * r, 0 ) );
  	}

  	// add faces with fan 
	for (var i = 1; i < geo.vertices.length - 1; i++) {
		geo.faces.push(new THREE.Face3(0, i, i + 1));
	}

	return geo;
}

var nShape = function (count, verts) {
  var pts = [];
  var r = 0.5;
  for ( var i = 0; i < count; i ++ ) {
    var a = 2 * i / count * Math.PI;
    var pt =  new THREE.Vector2 ( Math.cos( a ) * r, Math.sin( a ) * r ) ;
    pts.push( pt );
    if (verts !== undefined) verts.push(new THREE.Vector3(pt.x, pt.y, 0));
  }

  var shape = new THREE.Shape( pts );
  return shape;
}


class Building {
	constructor(scene, pos, timer, camera, texture) {
		// initialize example uniform variables and store in list
        var type = Math.floor(Math.random() * 4);
        this.uniforms = [];
        
        this.timer = timer;
        this.timeSpeed = Math.random() + 1;
        var direction = Math.random();
        // noise-water material
        
        // enable transparency of the material 
        //this.material.transparent = true;

		
		this.meshes = [];
		var source = [];
		var floorScale = Math.random() + 0.2;
		var size = new THREE.Vector3(floorScale, floorScale, Math.random() + 0.5);
		size.multiplyScalar(0.3);
		// keep current floor plan (list of overlapping shapes)
		var numFloors = 4 * Math.random() + 2;
		var z = 0;
		for (var i = 0; i < numFloors; i++) {
			// compute a random shape (can be triangle up to hexagon)
			if (i == 0) {
				var rShape = nShape(Math.floor(Math.random() * 3 + 4), source);
			} else {
				var rShape = nShape(Math.floor(Math.random() * 3 + 4), source);
			}
			var height = numFloors - i;
			if (i == 0 || i == 1) height = numFloors;
			var extrudeSettings = {
				steps: 2,
				amount: height,
				bevelEnabled: Math.random() < 0.2,
				bevelThickness: 0.8,
				bevelSize: 0.2,
				bevelSegments: 1
			};

			var shaderUniforms = {
				direction: {
					type: 'f',
	            	value: direction
				},
	            texture: {
	                type: "t", 
	                value: texture
	            },
	            type: {
	            	type: 'f',
	            	value: type
	            },
	            u_useTexture: {
	                type: 'i',
	                value: true
	            },
	            u_flashing: {
	            	type: 'i',
	            	value: 1
	            },
	            u_albedo: {
	                type: 'v3',
	                value: new THREE.Color('#dddddd')
	            },
	            u_ambient: {
	                type: 'v3',
	                value: new THREE.Color('#111111')
	            },
	            u_lightPos: {
	                type: 'v3',
	                value: new THREE.Vector3(30, 50, 40)
	            },
	            u_lightCol: {
	                type: 'v3',
	                value: new THREE.Color('#ffffff')
	            },
	            u_lightIntensity: {
	                type: 'f',
	                value: 2
	            },
	            u_camPos: {
	                type: 'v3',
	                value: camera.position
	            }, 
	            time: {
	                type: 'float',
	                value: timer.elapsedTime
	            }, 
	            alpha: {
	                type: 'float', 
	                value: 1.0
	            },
	            height: {
	            	type: 'f',
	            	value: height + 2 * Math.random()
	            },
	            speed: {
	            	type: 'f',
	            	value: this.timeSpeed
	            }
	        };

			var material = new THREE.ShaderMaterial({
              uniforms: shaderUniforms,
              vertexShader: require('./glsl/iridescent-vert.glsl'),
              fragmentShader: require('./glsl/iridescent-frag.glsl')
        	});

			// extrude the mesh
			var rMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(rShape, extrudeSettings), material);
			//console.log(rMesh.geometry)
			var idx = Math.floor(Math.random() * source.length);
			var v = source[idx];
			rMesh.position.set(v.x, v.y, v.z);
			Voronoi.resetTransform(rMesh);

			rMesh.scale.set(size.x, size.y, size.z);
			rMesh.position.set(pos.x, pos.y, pos.z);
			Voronoi.resetTransform(rMesh);
			this.uniforms.push(shaderUniforms);
			this.meshes.push(rMesh);
			scene.add(rMesh);
		}
	}
	tick() {
		this.uniforms.forEach(function (uniform) {
			uniform.time.value = this.timer.elapsedTime;
		}, this);
		//this.shaderUniforms.time.value = this.timer.elapsedTime;
	}
}

export default {
	Building: Building
}