import { mat4, vec3, vec4 } from "gl-matrix";
import Shape from "./Shape.js";

const ndcCube = [
  vec4.fromValues(-1, -1, -1, 1), // 0
  vec4.fromValues(-1, 1, -1, 1), // 1
  vec4.fromValues(-1, -1, 1, 1), // 2
  vec4.fromValues(-1, 1, 1, 1), // 3
  vec4.fromValues(1, -1, -1, 1), // 4
  vec4.fromValues(1, 1, -1, 1), // 5
  vec4.fromValues(1, -1, 1, 1), // 6
  vec4.fromValues(1, 1, 1, 1), // 7
];
/*
       1--------5
      /|       /|
     / |      / |
    3--+-----7  |
    |  |     |  |
    |  0-----+--4
    | /      | /
    |/       |/
    2--------6
  */

const indices = new Int32Array([
  // Far top
  1, 5,
  // Far left
  1, 0,
  // Far bottom
  0, 4,
  // Far right
  5, 4,

  // Left top
  1, 3,
  // Right top
  5, 7,
  // Left bottom
  0, 2,
  // Right bottom
  4, 6,

  // Near top
  3, 7,
  // Near left
  3, 2,
  // Near bottom
  2, 6,
  // Near right
  7, 6,
]);

export default class Frustum extends Shape {
  private transformedVertices: Array<vec3>;
  private transformedEdges: Array<vec3>;
  private transformedNormals: Array<vec3>;

  private transformMatrix: mat4;

  constructor() {
    super();
    this.transformedVertices = new Array<vec3>();
    this.transformedNormals = new Array<vec3>();
    this.transformedEdges = new Array<vec3>();
    this.transformMatrix = mat4.create();
    this.verticesNeedsUpdate = true;
    this.normalsNeedsUpdate = true;
    this.edgesNeedsUpdate = true;
  }

  setUpdateNeeded() {
    this.verticesNeedsUpdate = true;
    this.normalsNeedsUpdate = true;
    this.edgesNeedsUpdate = true;
  }

  setTransformMatrix(matrix: mat4) {
    this.transformMatrix = matrix;
    this.verticesNeedsUpdate = true;
    this.normalsNeedsUpdate = true;
    this.edgesNeedsUpdate = true;
  }

  getTransformedVertices(): Array<vec3> {
    if (this.verticesNeedsUpdate) {
      this.transformedVertices.length = 0;

      for (let i = 0; i < ndcCube.length; i++) {
        let vertex = vec4.transformMat4(
          vec4.create(),
          ndcCube[i],
          this.transformMatrix
        );
        vec4.scale(vertex, vertex, 1.0 / vertex[3]);
        this.transformedVertices.push(
          vec3.fromValues(vertex[0], vertex[1], vertex[2])
        );
      }
      this.verticesNeedsUpdate = false;
      this.normalsNeedsUpdate = true;
      this.edgesNeedsUpdate = true;
    }
    return this.transformedVertices;
  }

  /**
   *      1
   *      |
   *      |
   *      |
   *      0--------2
   *
   */
  private crossProdForNormal(
    vertexIndex0: number,
    vertexIndex1: number,
    vertexIndex2: number
  ) {
    let normal = vec3.cross(
      vec3.create(),
      vec3.sub(
        vec3.create(),
        this.transformedVertices[vertexIndex1],
        this.transformedVertices[vertexIndex0]
      ),
      vec3.sub(
        vec3.create(),
        this.transformedVertices[vertexIndex2],
        this.transformedVertices[vertexIndex0]
      )
    );
    return vec3.normalize(normal, normal);
  }

  getTransformedNormals(): Array<vec3> {
    this.getTransformedVertices();

    if (this.normalsNeedsUpdate) {
      this.transformedNormals.length = 0;

      // Do cross product to get the normals
      // Near plane and far plane will have the same normal (but mirrored, which is fine), other than that we need 4 different normals

      // Near plane
      this.transformedNormals.push(this.crossProdForNormal(2, 3, 6));

      // Left plane
      this.transformedNormals.push(this.crossProdForNormal(0, 1, 2));

      // Right plane
      this.transformedNormals.push(this.crossProdForNormal(6, 7, 4));

      // Top plane
      this.transformedNormals.push(this.crossProdForNormal(3, 1, 7));

      // Bottom plane
      this.transformedNormals.push(this.crossProdForNormal(0, 2, 4));

      this.normalsNeedsUpdate = false;
    }
    return this.transformedNormals;
  }

  private normalizedEdge(vertexIndex0: number, vertexIndex1: number) {
    let edge = vec3.sub(
      vec3.create(),
      this.transformedVertices[vertexIndex0],
      this.transformedVertices[vertexIndex1]
    );
    return vec3.normalize(edge, edge);
  }

  getTransformedEdges(): Array<vec3> {
    this.getTransformedVertices();

    if (this.edgesNeedsUpdate) {
      this.transformedEdges.length = 0;
      // Near and far plane edges will be the same, have to do vertical and horizontal for those
      // Also need the edges going from near to far plane, here all 4 are needed. Total of 6 edges

      // Far plane bottom
      this.transformedEdges.push(this.normalizedEdge(4, 0));

      // Far plane left
      this.transformedEdges.push(this.normalizedEdge(1, 0));

      // Left top
      this.transformedEdges.push(this.normalizedEdge(1, 3));

      // Right top
      this.transformedEdges.push(this.normalizedEdge(5, 7));

      // Left bottom
      this.transformedEdges.push(this.normalizedEdge(0, 2));

      // Right bottom
      this.transformedEdges.push(this.normalizedEdge(4, 6));

      this.edgesNeedsUpdate = false;
    }
    return this.transformedEdges;
  }

  getDrawingInfo(): { indices: Int32Array; mode: GLuint } {
    return { indices: indices, mode: WebGL2RenderingContext.LINES };
  }
}
