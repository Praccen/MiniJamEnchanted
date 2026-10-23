import GraphicsObject from "./GraphicsObject.js";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";
import { vec3 } from "gl-matrix";

export default class Mesh extends GraphicsObject {
  // Protected
  protected vertices: Float32Array;

  constructor(gl: WebGL2RenderingContext, vertices: Float32Array) {
    super(gl);

    this.vertices = vertices;
    this.setVertexData(this.vertices);
  }

  setVertexData(data: Float32Array) {
    this.vertices = data;
    super.setVertexData(data);
  }

  setupVertexAttributePointers(): void {
    // Change if input layout changes in shaders
    const stride = 8 * 4;
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(0);

    this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, stride, 3 * 4);
    this.gl.enableVertexAttribArray(1);

    this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, stride, 6 * 4);
    this.gl.enableVertexAttribArray(2);
  }

  setupInstancedVertexAttributePointers(): void {
    const stride = 16 * 4;
    this.gl.vertexAttribPointer(3, 4, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(3);
    this.gl.vertexAttribDivisor(3, 1);

    this.gl.vertexAttribPointer(4, 4, this.gl.FLOAT, false, stride, 4 * 4);
    this.gl.enableVertexAttribArray(4);
    this.gl.vertexAttribDivisor(4, 1);

    this.gl.vertexAttribPointer(5, 4, this.gl.FLOAT, false, stride, 8 * 4);
    this.gl.enableVertexAttribArray(5);
    this.gl.vertexAttribDivisor(5, 1);

    this.gl.vertexAttribPointer(6, 4, this.gl.FLOAT, false, stride, 12 * 4);
    this.gl.enableVertexAttribArray(6);
    this.gl.vertexAttribDivisor(6, 1);
  }

  getVertexPositions(): Array<vec3> {
    if (this.vertices == undefined) {
      return null;
    }
    let returnArr = new Array<vec3>();
    for (let i = 0; i < this.vertices.length; i += 8) {
      returnArr.push(
        vec3.fromValues(
          this.vertices[i],
          this.vertices[i + 1],
          this.vertices[i + 2]
        )
      );
    }
    return returnArr;
  }

  getNumVertices(): number {
    return this.vertices.length / 8;
  }

  draw(shaderProgram: ShaderProgram) {
    if (this.vertices != undefined && this.vertices.length > 0) {
      this.bindVAO();
      this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertices.length / 8);
    }
  }
}
