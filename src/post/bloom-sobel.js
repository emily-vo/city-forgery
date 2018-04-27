const THREE = require('three');
const EffectComposer = require('three-effectcomposer')(THREE)

var options = {
    amount: 1,
    halfRes: true
}
var SobelShader = new EffectComposer.ShaderPass({
    uniforms: {
        tDiffuse: {
            type: 't',
            value: null
        },
        u_amount: {
            type: 'f',
            value: options.amount
        }, 
        sHeight: {
            type: 'f', 
            value: screen.height
        }, 
        sWidth: {
            type: 'f', 
            value: screen.width
        }
    },
    vertexShader: require('../glsl/pass-vert.glsl'),
    fragmentShader: require('../glsl/sobel-frag.glsl')
});

var BloomSobelShader = new EffectComposer.ShaderPass({
    uniforms: {
        tDiffuse: {
            type: 't',
            value: null
        },
        u_amount: {
            type: 'f',
            value: options.amount
        }, 
        sHeight: {
            type: 'f', 
            value: screen.height
        }, 
        sWidth: {
            type: 'f', 
            value: screen.width
        }
    },
    vertexShader: require('../glsl/pass-vert.glsl'),
    fragmentShader: require('../glsl/sobel-bloom-frag.glsl')
});

export default function Grayscale(renderer, scene, camera) {
    // this is the THREE.js object for doing post-process effects
    var composer = new EffectComposer(renderer);

    // first render the scene normally and add that as the first pass
    composer.addPass(new EffectComposer.RenderPass(scene, camera));

    // then take the rendered result and apply the BloomSobelShader
    composer.addPass(SobelShader);  

    // then take the rendered result and apply the BloomSobelShader
    //renderer.setPixelRatio( window.devicePixelRatio / 4);
    composer.addPass(BloomSobelShader);  
    renderer.setPixelRatio( window.devicePixelRatio);

    // set this to true on the shader for your last pass to write to the screen
    BloomSobelShader.renderToScreen = true;  

    // if (this.fps.frame % this.fps.framerate === 0) {
    //    // set the framerate in runtime each second
       
    // }
    //set the framerate in runtime each second
    // renderer.setPixelRatio(
    //       (window.devicePixelRatio || 1) * Math.max(this.fps.framerate / 60, 0.2)
    //    );
    // if (options.halfRes) {
    //     renderer.setPixelRatio( window.devicePixelRatio / 2);
    //     //renderer.setSize( window.innerWidth / 2, window.innerHeight / 2);
    // }
    return {
        initGUI: function(gui) {
            gui.add(options, 'amount', 0, 1).onChange(function(val) {
                SobelShader.material.uniforms.u_amount.value = val;
            });
            gui.add(options, 'halfRes').onChange(function(val) {
                //SobelShader.material.uniforms.u_amount.value = val;
            });
        },
        
        render: function() {;
            composer.render();
        }
    }
}