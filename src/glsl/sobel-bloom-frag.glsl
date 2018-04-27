uniform sampler2D tDiffuse;
uniform float u_amount;
uniform float sWidth;
uniform float sHeight;
varying vec2 f_uv;


// Get the pixel in uv coordinates using an offset from the current position
vec2 getPixel(float x, float y) {
	return f_uv + vec2(1.0/sWidth, 1.0/sHeight) * vec2(x, y);
}

// Retrieves the color from the texture
vec4 getColor(vec2 pixel) {
	vec4 col = texture2D(tDiffuse, pixel);
	return col;
}

float grayscale(vec4 col) {
	return (col.r * 0.21 + col.g * 0.72 + col.b * 0.07);
}

void main() {
	vec2 coord = getPixel(0.0, 0.0);
	vec4 color = vec4(0.0);
	float sigma = 9.0;
	float total = 0.0;

	for (int i = -9; i < 10; i++) {
		for (int j = -9; j < 10; j++) {
			vec4 c = getColor(getPixel(float(i), float(j)));
			float t = exp(-(float(i) * float(i) + float(j) * float(j)) / (2.0 * sigma * sigma));
			total += t;
			if (grayscale(c) > .3) {
				color += t * c;
			}
		}
	}

	color /= total;
	//color += colorAt(vec2(coord.x, coord.y)).rgb;
	color += getColor(coord);
	gl_FragColor = vec4(color.r, color.g, color.b, 1.0);

	// Apply weighted average
	//gl_FragColor = 0.1107* (a + c + g + i) + 0.1113* (b + d + h + f) + 0.1119 * e;
}   