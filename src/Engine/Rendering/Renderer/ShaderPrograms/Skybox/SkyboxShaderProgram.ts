import ShaderProgram from "../ShaderProgram.js";

export const skyboxVertexSrc: string = `#version 300 es

layout (location = 0) in vec3 inPos;

out vec3 texCoords;

uniform mat4 viewProjMatrix;

void main()
{
    texCoords = inPos;
	texCoords.y *= -1.0;
	texCoords.z *= -1.0;
    vec4 pos = viewProjMatrix * vec4(inPos, 1.0);
    gl_Position = pos.xyww; 
}  
`;

const skyboxFragmentSrc: string = `#version 300 es
precision highp float;

layout (location = 0) out vec4 FragColor;
layout (location = 1) out float FragOpacity;

in vec3 texCoords;

uniform samplerCube skybox;

void main() {
	FragColor = texture(skybox, texCoords).rgba;
	FragOpacity = 0.0;
}
`;

export default class SkyboxShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, "SkyboxShaderProgram", skyboxVertexSrc, skyboxFragmentSrc);
  }
}
