import { vec3 } from "gl-matrix";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";

export default class GraphicsObject {
  // Private
  private VAO: WebGLVertexArrayObject;
  private VBO: WebGLBuffer;
  private EBO: WebGLBuffer;

  // Protected
  protected gl: WebGL2RenderingContext;

  mode: number;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    this.VAO = null;
    this.VBO = null;
    this.EBO = null; // Optional

    this.init();
    this.mode = gl.TRIANGLES;
  }

  init() {
    // Create buffers
    this.VAO = this.gl.createVertexArray();
    this.VBO = this.gl.createBuffer();
    this.EBO = this.gl.createBuffer();

    // Bind buffers
    this.gl.bindVertexArray(this.VAO);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.VBO);

    this.setupVertexAttributePointers();

    this.gl.bindVertexArray(null);
  }

  bindVAO() {
    this.gl.bindVertexArray(this.VAO);
  }

  unbindVAO() {
    this.gl.bindVertexArray(null);
  }

  setVertexData(data: Float32Array) {
    if (data == undefined || data.length == 0) {
      return;
    }
    this.gl.bindVertexArray(this.VAO);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.VBO);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    this.gl.bindVertexArray(null);
  }

  setIndexData(data: Int32Array) {
    this.gl.bindVertexArray(this.VAO);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.EBO);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

    this.gl.bindVertexArray(null);
  }

  setupVertexAttributePointers() {}

  setupInstancedVertexAttributePointers() {}

  getVertexPositions(): Array<vec3> {
    return null;
  }

  getNumVertices(): number {
    return null;
  }

  draw(shaderProgram: ShaderProgram) {}
}
