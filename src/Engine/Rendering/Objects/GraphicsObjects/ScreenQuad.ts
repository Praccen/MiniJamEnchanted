import GraphicsObject from "./GraphicsObject.js";
import Texture from "../../AssetHandling/Textures/Texture.js";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";

export default class ScreenQuad extends GraphicsObject {
  textures: Array<Texture>;

  // Private
  private vertices: Float32Array;
  private indices: Int32Array;

  constructor(gl: WebGL2RenderingContext, textures: Array<Texture>) {
    super(gl);

    // prettier-ignore
    this.vertices = new Float32Array([ 
            // positions        // uv
            -1.0,  1.0,     0.0, 1.0,
            -1.0, -1.0,     0.0, 0.0,
             1.0, -1.0,     1.0, 0.0,
             1.0,  1.0,     1.0, 1.0,
        ]);

    // prettier-ignore
    this.indices = new Int32Array([
            0, 1, 2,
            0, 2, 3,
        ]);

    this.setVertexData(this.vertices);
    this.setIndexData(this.indices);

    this.textures = textures;
  }

  setupVertexAttributePointers() {
    // Change if input layout changes in shaders
    const stride = 4 * 4;
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(0);

    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, stride, 2 * 4);
    this.gl.enableVertexAttribArray(1);
  }

  getNumVertices(): number {
    return this.indices.length;
  }

  draw(shaderProgram: ShaderProgram, bindTextures: boolean = true) {
    this.bindVAO();

    if (bindTextures) {
      for (let i = 0; i < this.textures.length; i++) {
        this.textures[i].bind(i);
      }
    }

    this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
  }
}
