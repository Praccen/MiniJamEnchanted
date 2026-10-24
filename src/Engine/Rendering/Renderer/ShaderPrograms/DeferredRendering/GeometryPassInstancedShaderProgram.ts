import ShaderProgram from "../ShaderProgram.js";
import { geometryFragmentShaderSrc } from "./GeometryPassShaderProgram.js";

const geometryInstancedVertexShaderSrc: string = `#version 300 es
layout (location = 0) in vec3 inPosition;
layout (location = 1) in vec3 inNormal;
layout (location = 2) in vec2 inTexCoords;

// Instanced attributes starts here
layout (location = 3) in mat4 inModelMatrix;

uniform mat4 viewProjMatrix;
uniform mat4 textureMatrix;

out vec3 fragPos;
out vec3 fragNormal;
out vec2 texCoords;

void main() {
    vec4 worldPos = inModelMatrix * vec4(inPosition, 1.0);
	texCoords = vec2(textureMatrix * vec4(inTexCoords, 0.0, 1.0));

	// There are a few reasons I calculate the normal matrix in the shader for instanced objects
	// It reduces the amount of data I have to update in the matrix attributes
	// I don't need a normal matrix in the shadow calculations, so there it is unnecessary to send all the extra data anyways
	mat3 normalMatrix = mat3(inModelMatrix);
	normalMatrix = inverse(normalMatrix);
	normalMatrix = transpose(normalMatrix);

	fragNormal = normalize(normalMatrix * inNormal);
	fragPos = worldPos.xyz;

    gl_Position = viewProjMatrix * worldPos;
}`;

export default class GeometryPassInstancedShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "GeometryPassInstanced",
      geometryInstancedVertexShaderSrc,
      geometryFragmentShaderSrc,
    );

    this.use();
  }
}
