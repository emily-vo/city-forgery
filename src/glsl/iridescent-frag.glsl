uniform sampler2D texture;
uniform int u_useTexture;
uniform vec3 u_albedo;
uniform vec3 u_ambient;
uniform vec3 u_lightPos;
uniform vec3 u_lightCol;
uniform float u_lightIntensity;
uniform vec3 u_camPos;
uniform float time;
uniform float height;
varying vec3 f_position;
varying vec3 f_normal;
varying vec2 f_uv;
varying float noise;
uniform float type;
uniform float speed;
uniform float direction;

float random(float a, float b, float c) {
    return fract(sin(dot(vec3(a, b, c), vec3(12.9898, 78.233, 578.233)))*43758.5453);
}

float lerp(float a, float b, float t) {
    return a * (1.0 - t) + b * t;
}

vec4 lerp(vec4 a, vec4 b, float t) {
    return a * (1.0 - t) + b * t;
}

float cerp(float a, float b, float t) {
    float cos_t = (1.0 - cos(t*3.14159)) * 0.5;
    return lerp(a, b, cos_t);
}

float interpolateNoise(float x, float y, float z) {
    float x0, y0, z0, x1, y1, z1;
    
    // Find the grid voxel that this point falls in
    x0 = floor(x);
    y0 = floor(y);
    z0 = floor(z);
    
    x1 = x0 + 1.0;
    y1 = y0 + 1.0;
    z1 = z0 + 1.0;
    
    // Generate noise at each of the 8 points
    float FUL, FUR, FLL, FLR, BUL, BUR, BLL, BLR;
    
    // front upper left
    FUL = random(x0, y1, z1);
    
    // front upper right
    FUR = random(x1, y1, z1);
    
    // front lower left
    FLL = random(x0, y0, z1);
    
    // front lower right
    FLR = random(x1, y0, z1);
    
    // back upper left
    BUL = random(x0, y1, z0);
    
    // back upper right
    BUR = random(x1, y1, z0);
    
    // back lower left
    BLL = random(x0, y0, z0);
    
    // back lower right
    BLR = random(x1, y0, z0);
    
    // Find the interpolate t values
    float n0, n1, m0, m1, v;
    float tx = fract(x - x0);
    float ty = fract(y - y0);
    float tz = fract(z - z0);
    tx = (x - x0);
    ty = (y - y0);
    tz = (z - z0);
    
    // interpolate along x and y for back
    n0 = cerp(BLL, BLR, tx);
    n1 = cerp(BUL, BUR, tx);
    m0 = cerp(n0, n1, ty);
    
    // interpolate along x and y for front
    n0 = cerp(FLL, FLR, tx);
    n1 = cerp(FUL, FUR, tx);
    m1 = cerp(n0, n1, ty);
    
    // interpolate along z
    v = cerp(m0, m1, tz);
    
    return v;
}

float generateNoise(float x, float y, float z) {
    float total = 0.0;
    float persistence = 1.0 / 2.0;
    int its = 0;
    for (int i = 0; i < 32; i++) {
        float freq = pow(2.0, float(i));
        float ampl = pow(persistence, float(i));
        total += interpolateNoise(freq*x, freq*y, freq*z)*ampl;
    }
    return total;
}
void main() {
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    float n =  generateNoise(f_uv[0], f_uv[1], abs(sin(time * speed)));
    float t = abs(sin(time * speed));
   //float n = generateNoise(f_position[0] + t, f_position[1] + t, f_position[2] + t);
   // float d = clamp(dot(-f_normal, normalize(u_camPos - f_position)), 0.0, 1.0);
    float d = clamp(dot(f_normal, normalize(u_camPos - f_position)), 0.0, 1.0);
    //Read from texture using relation to the view vector and a little bit of noise
    if (u_useTexture == 1) {
        //color = texture2D(texture, f_uv);
        color = texture2D(texture, vec2(f_uv[0], n * n));
    }
    // d * color.rgb * u_lightCol * u_lightIntensity + u_ambient, 1
    //gl_FragColor = vec4(d, d, d, 1);
   
    if (type == 0.0) {
		float xpos = f_uv.x * height;
		float xtest = floor(fract(xpos) + 0.2);
    	gl_FragColor = vec4(d * color.rgb * xtest, 1.0);
    } else if(type == 1.0) {
    	float ypos = f_uv.y * height;
		float ytest = floor(fract(ypos) + 0.2);
    	gl_FragColor = vec4(d * color.rgb * ytest, 1.0);
    } else if (type == 2.0) {
    	 float ypos = f_uv.y * height;
		float ytest = floor(fract(ypos) + 0.7);
		float xpos = f_uv.x * height;
		float xtest = floor(fract(xpos) + 0.7);
    	gl_FragColor = vec4(d * color.rgb * ytest * xtest, 1.0);
    } else {
    	float pos = lerp(f_uv.x, f_uv.y, direction) * height;
    	float test = floor(fract(pos) + 0.5);
    	vec3 color1 = d * color.rgb;
    	vec3 color2 = vec3(0.0);
    	float x = lerp(f_uv.x, f_uv.y, direction);
    	float y = lerp(f_uv.y, 1.0 - f_uv.x, direction);
    	x += sin(y * 3.14159 * height * direction);
    	float value = floor(fract(x) + 0.5);
    	gl_FragColor = lerp(vec4(color1, 1.0), vec4(color2, 1.0), value);
    	//gl_FragColor = vec4(d * color.rgb * test, 1.0);
    }
    
    if (f_normal[2] == 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    
    //gl_FragColor = vec4(f_uv[0], f_uv[1], 1, 1);
    //gl_FragColor = vec4(noise);
    //gl_FragColor = texture2D(texture, f_uv);
    //gl_FragColor.a = 0.2;
}