import GraphicsObject from "./GraphicsObject.js";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";
import CubeMap from "../../AssetHandling/Textures/CubeMap.js";

export default class Skybox extends GraphicsObject {
  // Public
  texture: CubeMap;

  // Private
  private vertices: Float32Array;
  private indices: Int32Array;

  constructor(gl: WebGL2RenderingContext, texture: CubeMap) {
    super(gl);

    // prettier-ignore
    this.vertices = new Float32Array([ 
            // positions
            -0.5,  0.5, -0.5,	/*0*/
            -0.5, -0.5, -0.5,	/*1*/
             0.5, -0.5, -0.5,	/*2*/
             0.5,  0.5, -0.5,	/*3*/
            -0.5,  0.5,  0.5,	/*4*/
            -0.5, -0.5,  0.5,	/*5*/
             0.5, -0.5,  0.5,	/*6*/
             0.5,  0.5,  0.5,	/*7*/
        ]);

    // prettier-ignore
    this.indices = new Int32Array([
            0, 1, 2,
            0, 2, 3,
			
			3, 2, 6,
			3, 6, 7,

			7, 6, 5,
			7, 5, 4,

			4, 5, 1,
			4, 1, 0,

			4, 0, 3,
			4, 3, 7,

			1, 5, 6, 
			1, 6, 2,
        ]);
    this.setVertexData(this.vertices);
    this.setIndexData(this.indices);

    this.texture = texture;
  }

  setupVertexAttributePointers() {
    // Change if input layout changes in shaders
    const stride = 3 * 4;
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(0);
  }

  getNumVertices(): number {
    return this.indices.length;
  }

  draw(shaderProgram: ShaderProgram) {
    this.bindVAO();

    this.texture.bind();

    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.indices.length,
      this.gl.UNSIGNED_INT,
      0,
    );
  }
}
