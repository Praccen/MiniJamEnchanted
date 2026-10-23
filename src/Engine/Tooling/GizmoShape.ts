import { vec3 } from "gl-matrix";
import Shape from "../Physics/Physics/Shapes/Shape.js";

/**
 * A Shape that holds an explicit list of world space line segments.
 * Used to draw the editor gizmos through the regular shapes render pass, which
 * draws with the depth test disabled, keeping the gizmo visible through geometry.
 *
 * This is a drawing only shape, it is never put in a physics scene, so the
 * normal/edge/edge normal parts of the Shape interface are left unimplemented.
 */
export default class GizmoShape extends Shape {
  private vertices: Array<vec3>;

  constructor() {
    super();
    this.vertices = new Array<vec3>();
  }

  /**
   * Replace the line segments of this shape.
   * @param vertices Pairs of points, every two entries make up one line.
   */
  setLineVertices(vertices: Array<vec3>) {
    this.vertices = vertices;
    this.verticesNeedsUpdate = true;
  }

  clear() {
    this.vertices.length = 0;
    this.verticesNeedsUpdate = true;
  }

  setUpdateNeeded() {
    this.verticesNeedsUpdate = true;
  }

  // Note: setTransformMatrix is deliberately not overridden. The vertices are
  // built in world space already, so the base class no-op is the correct
  // behaviour here.

  getOriginalVertices(): Array<vec3> {
    return this.vertices;
  }

  getTransformedVertices(): Array<vec3> {
    return this.vertices;
  }

  getDrawingInfo(): { indices: Int32Array; mode: GLuint } {
    return { indices: null, mode: WebGL2RenderingContext.LINES };
  }
}
