import { vec3 } from "gl-matrix";
import Shape from "./Shape.js";

/*
       3--------7
      /|       /|
     / |      / |
    2--+-----6  |
    |  |     |  |
    |  1-----+--5
    | /      | /
    |/       |/
    0--------4
  */

const indices = new Int32Array([
  // Far top
  3, 7,
  // Far left
  3, 1,
  // Far bottom
  1, 5,
  // Far right
  5, 7,

  // Left top
  2, 3,
  // Right top
  6, 7,
  // Left bottom
  0, 1,
  // Right bottom
  4, 5,

  // Near top
  2, 6,
  // Near left
  2, 0,
  // Near bottom
  0, 4,
  // Near right
  6, 4,
]);

export default class TreeAABB extends Shape {
  private transformedVertices: Array<vec3>;
  private transformedNormals: Array<vec3>;

  constructor() {
    super();
    this.transformedVertices = new Array<vec3>();
    this.transformedNormals = new Array<vec3>();
    this.verticesNeedsUpdate = false;
    this.normalsNeedsUpdate = false;

    this.setMinAndMaxVectors(
      vec3.fromValues(-0.5, -0.5, -0.5),
      vec3.fromValues(0.5, 0.5, 0.5)
    );
  }

  /**
   * Creates an axis aligned bounding box (AABB).
   * @param minVec Corner for the lower bound.
   * @param maxVec Corner for the upper bound.
   */
  setMinAndMaxVectors(minVec: vec3, maxVec: vec3) {
    this.transformedNormals.length = 0;
    this.transformedNormals.push(vec3.fromValues(1.0, 0.0, 0.0));
    this.transformedNormals.push(vec3.fromValues(0.0, 1.0, 0.0));
    this.transformedNormals.push(vec3.fromValues(0.0, 0.0, 1.0));

    this.transformedVertices.length = 0;

    for (let i = 0; i < 8; i++) {
      this.transformedVertices.push(vec3.create());
    }

    vec3.copy(this.transformedVertices[0], minVec);
    vec3.set(this.transformedVertices[1], minVec[0], minVec[1], maxVec[2]);
    vec3.set(this.transformedVertices[2], minVec[0], maxVec[1], minVec[2]);
    vec3.set(this.transformedVertices[3], minVec[0], maxVec[1], maxVec[2]);
    vec3.set(this.transformedVertices[4], maxVec[0], minVec[1], minVec[2]);
    vec3.set(this.transformedVertices[5], maxVec[0], minVec[1], maxVec[2]);
    vec3.set(this.transformedVertices[6], maxVec[0], maxVec[1], minVec[2]);
    vec3.copy(this.transformedVertices[7], maxVec);
  }

  getTransformedVertices(): Array<vec3> {
    return this.transformedVertices;
  }

  getTransformedNormals(): Array<vec3> {
    return this.transformedNormals;
  }

  getTransformedEdges(): Array<vec3> {
    return this.getTransformedNormals();
  }

  getTransformedEdgeNormals(): Array<vec3> {
    return this.getTransformedNormals();
  }

  getDrawingInfo(): { indices: Int32Array; mode: GLuint } {
    return { indices: indices, mode: WebGL2RenderingContext.LINES };
  }
}
