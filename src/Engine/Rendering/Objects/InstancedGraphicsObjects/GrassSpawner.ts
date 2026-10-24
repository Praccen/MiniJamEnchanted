import GraphicsObject from "../GraphicsObjects/GraphicsObject.js";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";
import { vec3 } from "gl-matrix";

export default class GrassSpawner extends GraphicsObject {
  // Private
  private numGrassStraws: number;
  private vertices: Float32Array;
  private instanceVBO: WebGLBuffer;

  constructor(
    gl: WebGL2RenderingContext,
    numberOfStartingGrassStraws: number = 0,
  ) {
    super(gl);

    this.bindVAO();
    this.instanceVBO = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      numberOfStartingGrassStraws * 7 * 4,
      this.gl.STATIC_DRAW,
    );
    this.setupInstancedVertexAttributePointers();
    this.unbindVAO();

    // prettier-ignore
    this.vertices = new Float32Array([ 
            // positions  // uv
             0.0,  1.0,   0.5, 1.0,
            -0.1,  0.0,   0.0, 0.0,
             0.1,  0.0,   1.0, 0.0,
        ]);

    this.setVertexData(this.vertices);

    // All starting particles are initialized as size and position 0, so they wont be visable unless manually changed
    this.numGrassStraws = numberOfStartingGrassStraws;
  }

  setNumGrassStraws(amount: number) {
    this.numGrassStraws = amount;

    this.bindVAO();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.numGrassStraws * 7 * 4,
      this.gl.STATIC_DRAW,
    );
    this.unbindVAO();
  }

  getNumberOfGrassStraws(): number {
    return this.numGrassStraws;
  }

  setGrassStrawData(
    particleIndex: number,
    startPosition: vec3,
    size: number,
    tipOffset: vec3,
  ): boolean {
    if (particleIndex > this.numGrassStraws) {
      return false;
    }

    let data = new Float32Array([
      startPosition[0],
      startPosition[1],
      startPosition[2],
      size,
      tipOffset[0],
      tipOffset[1],
      tipOffset[2],
    ]);

    this.bufferSubDataUpdate(particleIndex * 7, data);

    return true;
  }

  setGrassStrawPosition(particleIndex: number, position: vec3): boolean {
    if (particleIndex > this.numGrassStraws) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 7, <Float32Array>position);
    return true;
  }

  setGrassStrawSize(particleIndex: number, size: number): boolean {
    if (particleIndex > this.numGrassStraws) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 7 + 3, new Float32Array([size]));
    return true;
  }

  setGrassTipOffset(particleIndex: number, offset: vec3): boolean {
    if (particleIndex > this.numGrassStraws) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 7 + 4, <Float32Array>offset);
    return true;
  }

  bufferSubDataUpdate(start: number, data: Float32Array): boolean {
    if (start < 0 || start + data.length > this.numGrassStraws * 7) {
      return false;
    }
    this.bindVAO();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, start * 4, data);
    this.unbindVAO();
    return true;
  }

  getNumVertices(): number {
    return this.vertices.length / 4;
  }

  draw(shaderProgram: ShaderProgram) {
    this.bindVAO();

    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 3, this.numGrassStraws);
    this.unbindVAO();
  }
}
