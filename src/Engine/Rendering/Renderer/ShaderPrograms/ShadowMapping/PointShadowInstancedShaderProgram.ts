import ShaderProgram from "../ShaderProgram.js";
import { pointShadowFragmentShaderSrc } from "./PointShadowShaderProgram.js";

const pointShadowVertexShaderSrc: string = `#version 300 es
layout (location = 0) in vec3 inPosition;
layout (location = 1) in vec3 inNormal;
layout (location = 2) in vec2 inTexCoords;

// Instanced attributes starts here
layout (location = 3) in mat4 inModelMatrix;

uniform mat4 lightSpaceMatrix;
uniform mat4 textureMatrix;

out vec2 texCoords;
out vec3 fragPos;

void main()
{
    gl_Position = lightSpaceMatrix * inModelMatrix * vec4(inPosition, 1.0);
    fragPos = vec3(inModelMatrix * vec4(inPosition, 1.0));
	texCoords = vec2(textureMatrix * vec4(inTexCoords, 0.0, 1.0));
}`;

export default class PointShadowInstancedShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "PointShadowInstanced",
      pointShadowVertexShaderSrc,
      pointShadowFragmentShaderSrc,
    );

    this.use();
  }
}
