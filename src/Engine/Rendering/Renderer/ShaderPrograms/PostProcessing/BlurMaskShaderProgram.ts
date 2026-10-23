import ShaderProgram from "../ShaderProgram.js";
import { screenQuadVertexSrc } from "../ScreenQuadShaderProgram.js";

const blurMaskFragmentSrc: string = `#version 300 es
precision highp float;

out vec4 fragColor;
  
in vec2 texCoords;

uniform sampler2D image;
uniform sampler2D mask;

void main()
{             
    vec2 texOffset = vec2(1.0 / float(textureSize(image, 0).x), 1.0 / float(textureSize(image, 0).y)); // gets size of single texel
    vec3 noBlurResult = texture(image, texCoords).rgb;
    int useBlur = 0;
    const int kernel = 3;

    vec3 weightsum = vec3(0);
    vec3 accumulation = vec3(0);

    for(int x = -kernel; x <= kernel; ++x)
    {
        for(int y = -kernel; y <= kernel; ++y)
        {
            vec2 coord = texCoords + vec2(texOffset.x * float(x), texOffset.y * float(y));

            if (texture(mask, coord).r > 0.0) {
                useBlur = 1;
            }

            accumulation += texture(image, coord).rgb;
            weightsum += 1.0;
        }
    }

    vec3 result;
    if (useBlur == 1) {
        result = accumulation / weightsum;
    } else {
        result = noBlurResult;
    }
    
    fragColor = vec4(result, 1.0);
}`;

export default class BlurMaskShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, "blurMask", screenQuadVertexSrc, blurMaskFragmentSrc);

    this.use();
  }
}
