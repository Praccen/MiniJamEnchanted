import { mat3, mat4, vec3 } from "gl-matrix";
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

export default class OBB extends Shape {
  private originalVertices: Array<vec3>;
  private originalNormals: Array<vec3>;

  private transformedVertices: Array<vec3>;
  private transformedNormals: Array<vec3>;

  private transformMatrix: mat4;
  private inverseMatrix: mat4;

  constructor() {
    super();
    this.originalVertices = new Array<vec3>();
    this.originalNormals = new Array<vec3>();
    this.transformedVertices = new Array<vec3>();
    this.transformedNormals = new Array<vec3>();
    this.transformMatrix = mat4.create();
    this.inverseMatrix = mat4.create();
    this.verticesNeedsUpdate = false;
    this.normalsNeedsUpdate = false;

    this.setMinAndMaxVectors(
      vec3.fromValues(-0.5, -0.5, -0.5),
      vec3.fromValues(0.5, 0.5, 0.5)
    );
  }

  setVertices(vertices: Array<vec3>) {
    this.originalVertices.length = 0;
    for (let vert of vertices) {
      this.originalVertices.push(vert);
    }

    this.verticesNeedsUpdate = true;
  }

  setNormals(normals: Array<vec3>) {
    this.originalNormals.length = 0;
    for (let norm of normals) {
      this.originalNormals.push(norm);
    }

    this.normalsNeedsUpdate = true;
  }

  /**
   * Creates an axis aligned bounding box (AABB).
   * @param minVec Corner for the lower bound.
   * @param maxVec Corner for the upper bound.
   */
  setMinAndMaxVectors(minVec: vec3, maxVec: vec3) {
    this.originalNormals.length = 0;
    this.originalNormals.push(vec3.fromValues(1.0, 0.0, 0.0));
    this.originalNormals.push(vec3.fromValues(0.0, 1.0, 0.0));
    this.originalNormals.push(vec3.fromValues(0.0, 0.0, 1.0));

    this.originalVertices.length = 0;

    for (let i = 0; i < 8; i++) {
      this.originalVertices.push(vec3.create());
    }

    vec3.copy(this.originalVertices[0], minVec);
    vec3.set(this.originalVertices[1], minVec[0], minVec[1], maxVec[2]);
    vec3.set(this.originalVertices[2], minVec[0], maxVec[1], minVec[2]);
    vec3.set(this.originalVertices[3], minVec[0], maxVec[1], maxVec[2]);
    vec3.set(this.originalVertices[4], maxVec[0], minVec[1], minVec[2]);
    vec3.set(this.originalVertices[5], maxVec[0], minVec[1], maxVec[2]);
    vec3.set(this.originalVertices[6], maxVec[0], maxVec[1], minVec[2]);
    vec3.copy(this.originalVertices[7], maxVec);

    this.normalsNeedsUpdate = true;
    this.verticesNeedsUpdate = true;
  }

  setMinAndMaxFromPointArray(pointArray: Array<vec3>) {
    if (pointArray == undefined || pointArray.length == 0) {
      return;
    }

    this.originalNormals.length = 0;
    this.originalNormals.push(vec3.fromValues(1.0, 0.0, 0.0));
    this.originalNormals.push(vec3.fromValues(0.0, 1.0, 0.0));
    this.originalNormals.push(vec3.fromValues(0.0, 0.0, 1.0));

    this.originalVertices.length = 0;

    let minVec = vec3.fromValues(Infinity, Infinity, Infinity);
    let maxVec = vec3.fromValues(-Infinity, -Infinity, -Infinity);

    for (const point of pointArray) {
      vec3.min(minVec, minVec, point);
      vec3.max(maxVec, maxVec, point);
    }

    for (let i = 0; i < 8; i++) {
      this.originalVertices.push(vec3.create());
    }

    vec3.copy(this.originalVertices[0], minVec);
    vec3.set(this.originalVertices[1], minVec[0], minVec[1], maxVec[2]);
    vec3.set(this.originalVertices[2], minVec[0], maxVec[1], minVec[2]);
    vec3.set(this.originalVertices[3], minVec[0], maxVec[1], maxVec[2]);
    vec3.set(this.originalVertices[4], maxVec[0], minVec[1], minVec[2]);
    vec3.set(this.originalVertices[5], maxVec[0], minVec[1], maxVec[2]);
    vec3.set(this.originalVertices[6], maxVec[0], maxVec[1], minVec[2]);
    vec3.copy(this.originalVertices[7], maxVec);

    this.normalsNeedsUpdate = true;
    this.verticesNeedsUpdate = true;
  }

  setUpdateNeeded() {
    this.verticesNeedsUpdate = true;
    this.normalsNeedsUpdate = true;
  }

  setTransformMatrix(matrix: mat4) {
    this.transformMatrix = matrix;
    this.verticesNeedsUpdate = true;
    this.normalsNeedsUpdate = true;
  }

  setInverseMatrix(matrix: mat4): void {
    this.inverseMatrix = matrix;
    this.verticesNeedsUpdate = true;
    this.normalsNeedsUpdate = true;
  }

  getTransformedVertices(): Array<vec3> {
    if (this.verticesNeedsUpdate) {
      this.transformedVertices.length = 0;

      let resultingMatrix = mat4.mul(
        mat4.create(),
        this.inverseMatrix,
        this.transformMatrix
      );

      for (const originalVertex of this.originalVertices) {
        this.transformedVertices.push(
          vec3.transformMat4(vec3.create(), originalVertex, resultingMatrix)
        );
      }
      this.verticesNeedsUpdate = false;
    }
    return this.transformedVertices;
  }

  getTransformedNormals(): Array<vec3> {
    if (this.normalsNeedsUpdate) {
      this.transformedNormals.length = 0;

      let resultingMatrix = mat4.mul(
        mat4.create(),
        this.inverseMatrix,
        this.transformMatrix
      );

      for (const originalNormal of this.originalNormals) {
        this.transformedNormals.push(
          vec3.normalize(
            vec3.create(),
            vec3.transformMat3(
              vec3.create(),
              originalNormal,
              mat3.normalFromMat4(mat3.create(), resultingMatrix)
            )
          )
        );
      }

      this.normalsNeedsUpdate = false;
    }
    return this.transformedNormals;
  }

  getTransformedEdges(): Array<vec3> {
    return this.getTransformedNormals();
  }

  getTransformedEdgeNormals(): Array<vec3> {
    return this.getTransformedNormals();
  }

  getTransformMatrix(): mat4 {
    return this.transformMatrix;
  }

  getDrawingInfo(): { indices: Int32Array; mode: GLuint } {
    return { indices: indices, mode: WebGL2RenderingContext.LINES };
  }
}
