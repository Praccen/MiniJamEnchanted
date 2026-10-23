import ShaderProgram from "./ShaderProgram.js";

export const screenQuadVertexSrc: string = `#version 300 es

layout (location = 0) in vec2 inPos;
layout (location = 1) in vec2 inTexCoords;

out vec2 texCoords;

void main()
{
    texCoords = inTexCoords;
    gl_Position = vec4(inPos, 0.0, 1.0); 
}  
`;

const screenQuadFragmentSrc: string = `#version 300 es
precision highp float;

out vec4 FragColor;
in vec2 texCoords;

uniform sampler2D screenTexture;

void main() {
    FragColor = texture(screenTexture, texCoords).rgba;
}
`;

export default class ScreenQuadShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "ScreenQuadShaderProgram",
      screenQuadVertexSrc,
      screenQuadFragmentSrc
    );
  }
}
