import { screenQuadVertexSrc } from "../ScreenQuadShaderProgram.js";
import ShaderProgram from "../ShaderProgram.js";

const screenQuadFragmentSrc: string = `#version 300 es
precision highp float;

out vec4 FragColor;
in vec2 texCoords;

uniform sampler2D screenTexture;

void main() {
	vec2 texOffset = vec2(1.0 / float(textureSize(screenTexture, 0).x), 1.0 / float(textureSize(screenTexture, 0).y)); // gets size of single texel
    const int kernel = 2;

    vec4 weightsum = vec4(0);
    vec4 accumulation = vec4(0);

    for(int x = -kernel; x <= kernel; ++x)
    {
        for(int y = -kernel; y <= kernel; ++y)
        {
            vec2 coord = texCoords + vec2(texOffset.x * float(x), texOffset.y * float(y));

            accumulation += texture(screenTexture, coord);
            weightsum += 1.0;
        }
    }

	FragColor = accumulation / weightsum;
}
`;

export default class VolumetricCombineShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "volumetricCombineShaderProgram",
      screenQuadVertexSrc,
      screenQuadFragmentSrc,
    );
  }
}
