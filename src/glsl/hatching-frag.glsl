
uniform sampler2D tDiffuse;
uniform float u_amount;
varying vec2 f_uv;
uniform float sWidth;
uniform float sHeight;

// tDiffuse is a special uniform sampler that THREE.js will bind the previously rendered frame to
vec2 getPixel(float x, float y) {
	return f_uv + vec2(1.0/sWidth, 1.0/sHeight) * vec2(x, y);
}

void main() {
    vec4 col = texture2D(tDiffuse, f_uv);
    float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
    vec2 pixel = getPixel(0.0, 0.0);
    float sin = sin(pixel.x + pixel.y);
    //float cos = cos(pixel.y);
    col.rgb = vec3(gray, gray, gray) * (u_amount) + col.rgb * (1.0 - u_amount) * sin;
    gl_FragColor = col;
}   