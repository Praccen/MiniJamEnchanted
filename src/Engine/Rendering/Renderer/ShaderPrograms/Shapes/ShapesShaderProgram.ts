import ShaderProgram from "../ShaderProgram.js";

const shapesVertexShaderSrc: string = `#version 300 es
layout (location = 0) in vec3 inPosition;

uniform mat4 viewProjMatrix;

void main() {
    gl_Position = viewProjMatrix * vec4(inPosition, 1.0);
}`;

const shapesFragmentSrc: string = `#version 300 es
precision highp float;

uniform vec4 colour;

out vec4 FragColor;

void main() {
    FragColor = colour;
}
`;

export default class ShapesShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, "ShapesShaderProgram", shapesVertexShaderSrc, shapesFragmentSrc);
  }
}
