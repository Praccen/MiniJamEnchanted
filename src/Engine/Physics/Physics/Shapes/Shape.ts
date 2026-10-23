import { mat4, vec3 } from "gl-matrix";

export default class Shape {
  margin: number;

  protected verticesNeedsUpdate: boolean;
  protected normalsNeedsUpdate: boolean;
  protected edgesNeedsUpdate: boolean;
  protected edgeNormalsNeedsUpdate: boolean;

  constructor() {
    this.margin = 0.0;

    this.verticesNeedsUpdate = false;
    this.normalsNeedsUpdate = false;
    this.edgesNeedsUpdate = false;
    this.edgeNormalsNeedsUpdate = false;
  }

  setUpdateNeeded() {}

  getVertexUpdateNeeded(): boolean {
    return this.verticesNeedsUpdate;
  }

  setTransformMatrix(matrix: mat4) {}

  getOriginalVertices(): Array<vec3> {
    return null;
  }

  getTransformedVertices(): Array<vec3> {
    return null;
  }

  getTransformedNormals(): Array<vec3> {
    return null;
  }

  getTransformedEdges(): Array<vec3> {
    return null;
  }

  getTransformedEdgeNormals(): Array<vec3> {
    return null;
  }

  getDrawingInfo(): { indices: Int32Array; mode: GLuint } {
    return { indices: null, mode: WebGL2RenderingContext.POINTS };
  }
}
