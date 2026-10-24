import ShaderProgram from "./ShaderProgram.js";
import { screenQuadVertexSrc } from "./ScreenQuadShaderProgram.js";

const downsampleFragmentSrc: string = `#version 300 es
precision highp float;

out vec4 FragColor;
in vec2 texCoords;

uniform sampler2D screenTexture;

// Number of samples per axis to average. 1 means a straight copy.
uniform int ssaaSamples;

void main() {
    if (ssaaSamples <= 1) {
        FragColor = texture(screenTexture, texCoords).rgba;
        return;
    }

    // Average an NxN block of source texels. texCoords sits at the centre of
    // the output pixel, which spans N source texels, so the taps run from
    // -(N-1)/2 to +(N-1)/2 texels around it. Sampling at exact texel centres
    // means each tap is a single texel rather than a bilinear blend of four,
    // which would over-blur.
    vec2 texelSize = vec2(1.0) / vec2(textureSize(screenTexture, 0));

    vec4 accumulation = vec4(0.0);
    float weightSum = 0.0;

    float start = -0.5 * (float(ssaaSamples) - 1.0);

    for (int x = 0; x < ssaaSamples; x++) {
        for (int y = 0; y < ssaaSamples; y++) {
            vec2 offset = vec2(start + float(x), start + float(y)) * texelSize;
            accumulation += texture(screenTexture, texCoords + offset);
            weightSum += 1.0;
        }
    }

    FragColor = accumulation / weightSum;
}
`;

export default class DownsampleShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "DownsampleShaderProgram",
      screenQuadVertexSrc,
      downsampleFragmentSrc,
    );
  }
}
