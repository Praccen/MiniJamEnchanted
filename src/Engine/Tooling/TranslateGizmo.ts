import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { Camera, Scene, ShapeGraphicsObject, Transform } from "../../Engine.js";
import GizmoShape from "./GizmoShape.js";

/**
 * Which part of the gizmo the user grabbed.
 * The axis handles move along one axis, the plane handles move within one plane,
 * and SCREEN moves the object parallel to the camera plane.
 */
export enum GizmoHandle {
  NONE,
  X,
  Y,
  Z,
  XY,
  XZ,
  YZ,
  SCREEN,
}

const axisDirections: { [handle: number]: vec3 } = {
  [GizmoHandle.X]: vec3.fromValues(1.0, 0.0, 0.0),
  [GizmoHandle.Y]: vec3.fromValues(0.0, 1.0, 0.0),
  [GizmoHandle.Z]: vec3.fromValues(0.0, 0.0, 1.0),
};

/**
 * The two axes that span each planar handle, and the plane normal.
 */
const planeAxes: {
  [handle: number]: { first: vec3; second: vec3; normal: vec3 };
} = {
  [GizmoHandle.XY]: {
    first: vec3.fromValues(1.0, 0.0, 0.0),
    second: vec3.fromValues(0.0, 1.0, 0.0),
    normal: vec3.fromValues(0.0, 0.0, 1.0),
  },
  [GizmoHandle.XZ]: {
    first: vec3.fromValues(1.0, 0.0, 0.0),
    second: vec3.fromValues(0.0, 0.0, 1.0),
    normal: vec3.fromValues(0.0, 1.0, 0.0),
  },
  [GizmoHandle.YZ]: {
    first: vec3.fromValues(0.0, 1.0, 0.0),
    second: vec3.fromValues(0.0, 0.0, 1.0),
    normal: vec3.fromValues(1.0, 0.0, 0.0),
  },
};

const colourX: vec4 = vec4.fromValues(1.0, 0.25, 0.25, 1.0);
const colourY: vec4 = vec4.fromValues(0.35, 1.0, 0.35, 1.0);
const colourZ: vec4 = vec4.fromValues(0.35, 0.6, 1.0, 1.0);
const colourScreen: vec4 = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
const colourHighlight: vec4 = vec4.fromValues(1.0, 0.95, 0.2, 1.0);

/**
 * How long the gizmo should appear on screen, as a fraction of the viewport
 * height. The gizmo is scaled by distance so it keeps this size at any range.
 */
const defaultScreenSize: number = 3.0;

/** How close, in pixels, the cursor must be to a handle to grab it. */
const pickPixelRadius: number = 14.0;

/**
 * Thickness of the drawn lines, in pixels.
 *
 * gl.lineWidth is deliberately not used: the WebGL spec permits a maximum
 * supported width of 1, and most implementations (ANGLE on Windows, and Chrome
 * in general) clamp to exactly that, so it is silently ignored. Instead each
 * line is drawn as several parallel offset copies, which works everywhere.
 *
 * This is specified in pixels rather than as a fraction of the gizmo size so
 * that changing the gizmo length does not change how heavy the lines look.
 */
const lineThicknessPixels: number = 7.0;

/**
 * Spacing between neighbouring copies of a line, in pixels. Kept below one
 * pixel so the copies merge into a solid stroke instead of visible stripes.
 * The number of copies is derived from this, so changing the thickness or the
 * gizmo size cannot reintroduce gaps.
 */
const lineCopySpacingPixels: number = 0.75;

/**
 * Upper bound on copies per line, to keep the vertex count sane. High enough
 * to cover the pixel thickness above on a high DPI viewport without gaps.
 */
const maxLineCopies: number = 48;

/** Where along the axis the planar handle quads sit, relative to axis length. */
const planeHandleOffset: number = 0.35;
const planeHandleSize: number = 0.22;

/** Half width of the little box drawn at the origin for the screen space handle. */
const screenHandleSize: number = 0.11;

export default class TranslateGizmo {
  /** Set to false to hide the gizmo and ignore all of its input. */
  enabled: boolean = true;

  /** Grid step used when snapping is requested. Also settable from the console. */
  snapStep: number = 0.5;

  /**
   * On screen size of the gizmo, as a fraction of viewport height.
   * Settable from the console with "set gizmosize".
   */
  screenSize: number = defaultScreenSize;

  private camera: Camera;
  private scene: Scene;

  private target: Transform = null;

  /**
   * One shape per handle. The shapes render pass binds a single colour uniform
   * per ShapeGraphicsObject, so each handle needs its own object to be drawn in
   * its own colour and to be highlighted independently.
   */
  private parts: Map<
    GizmoHandle,
    { shape: GizmoShape; graphicsObject: ShapeGraphicsObject; colour: vec4 }
  >;

  private hoveredHandle: GizmoHandle = GizmoHandle.NONE;
  private activeHandle: GizmoHandle = GizmoHandle.NONE;

  /**
   * Offset between the object origin and the point the user actually grabbed,
   * so the object does not jump to the cursor when the drag starts.
   */
  private grabOffset: vec3 = vec3.create();

  /** Object position when the drag started, used as the base for snapping. */
  private dragStartPosition: vec3 = vec3.create();

  private axisLength: number = 1.0;

  /** Scales line thickness while building one handle, used for the hover highlight. */
  private thicknessMultiplier: number = 1.0;

  constructor(camera: Camera, scene: Scene) {
    this.camera = camera;
    this.scene = scene;

    this.parts = new Map<
      GizmoHandle,
      { shape: GizmoShape; graphicsObject: ShapeGraphicsObject; colour: vec4 }
    >();

    const handleColours: Array<[GizmoHandle, vec4]> = [
      [GizmoHandle.X, colourX],
      [GizmoHandle.Y, colourY],
      [GizmoHandle.Z, colourZ],
      // Planar handles share the colour of the axis they are not aligned with,
      // matching the convention used by most editors.
      [GizmoHandle.XY, colourZ],
      [GizmoHandle.XZ, colourY],
      [GizmoHandle.YZ, colourX],
      [GizmoHandle.SCREEN, colourScreen],
    ];

    for (const [handle, colour] of handleColours) {
      const shape = new GizmoShape();
      const graphicsObject = scene.addNewShape(shape);
      vec4.copy(graphicsObject.colour, colour);
      this.parts.set(handle, {
        shape: shape,
        graphicsObject: graphicsObject,
        colour: colour,
      });
    }
  }

  setTarget(transform: Transform) {
    this.target = transform;
    if (transform == null) {
      this.activeHandle = GizmoHandle.NONE;
      this.hoveredHandle = GizmoHandle.NONE;
      this.clearGeometry();
    }
  }

  getTarget(): Transform {
    return this.target;
  }

  /** True while the user is dragging a handle. */
  isDragging(): boolean {
    return this.activeHandle != GizmoHandle.NONE;
  }

  /** True if the cursor is currently over a handle, used to suppress selection clicks. */
  isHovered(): boolean {
    return this.hoveredHandle != GizmoHandle.NONE;
  }

  /**
   * Try to start a drag at the given mouse position.
   * @returns true if a handle was grabbed, in which case the caller should not
   * treat this click as a selection click.
   */
  startDrag(mousePosition: vec2): boolean {
    if (!this.enabled || this.target == null) {
      return false;
    }

    const handle = this.pickHandle(mousePosition);
    if (handle == GizmoHandle.NONE) {
      return false;
    }

    this.activeHandle = handle;
    vec3.copy(this.dragStartPosition, this.target.position);

    // Record where on the handle the user grabbed, relative to the object origin.
    const grabPoint = this.projectMouseOntoHandle(mousePosition, handle);
    if (grabPoint == null) {
      this.activeHandle = GizmoHandle.NONE;
      return false;
    }
    vec3.sub(this.grabOffset, grabPoint, this.target.position);

    return true;
  }

  /**
   * Continue an in progress drag.
   * @param snap Snap the result to snapStep, typically bound to shift.
   * @returns true if the object was moved, so the caller can flag an unsaved change.
   */
  updateDrag(mousePosition: vec2, snap: boolean): boolean {
    if (this.activeHandle == GizmoHandle.NONE || this.target == null) {
      return false;
    }

    const point = this.projectMouseOntoHandle(mousePosition, this.activeHandle);
    if (point == null) {
      return false;
    }

    let newPosition = vec3.sub(vec3.create(), point, this.grabOffset);

    if (snap && this.snapStep > 0.0) {
      // Only snap the components this handle is actually allowed to change,
      // otherwise a single axis drag would quantize the other two as well.
      const movable = this.movableComponents(this.activeHandle);
      for (let i = 0; i < 3; i++) {
        if (movable[i]) {
          newPosition[i] =
            Math.round(newPosition[i] / this.snapStep) * this.snapStep;
        } else {
          newPosition[i] = this.dragStartPosition[i];
        }
      }
    }

    if (vec3.equals(newPosition, this.target.position)) {
      return false;
    }

    this.target.setTranslation(newPosition);
    return true;
  }

  endDrag() {
    this.activeHandle = GizmoHandle.NONE;
  }

  /** Update the hover highlight. Call this on mouse move while not dragging. */
  updateHover(mousePosition: vec2) {
    if (!this.enabled || this.target == null) {
      this.hoveredHandle = GizmoHandle.NONE;
      return;
    }
    this.hoveredHandle = this.pickHandle(mousePosition);
  }

  /**
   * Rebuild the gizmo line geometry. Call once per frame before rendering.
   */
  updateGeometry() {
    if (!this.enabled || this.target == null) {
      this.clearGeometry();
      return;
    }

    const origin = this.target.position;
    this.axisLength = this.calculateAxisLength(origin);

    // The handle being dragged keeps the highlight even if the cursor drifts off it.
    const highlighted =
      this.activeHandle != GizmoHandle.NONE
        ? this.activeHandle
        : this.hoveredHandle;

    for (const [handle, part] of this.parts) {
      let vertices: Array<vec3> = [];

      // Fatten the handle under the cursor as well as recolouring it. Colour
      // alone is weak here, since the highlight sits close to the X axis red
      // and the white centre handle.
      this.thicknessMultiplier = handle == highlighted ? 2.0 : 1.0;

      if (axisDirections[handle] != undefined) {
        this.appendAxis(vertices, origin, handle);
      } else if (planeAxes[handle] != undefined) {
        this.appendPlaneHandle(vertices, origin, handle);
      } else {
        this.appendScreenHandle(vertices, origin);
      }

      part.shape.setLineVertices(vertices);
      vec4.copy(
        part.graphicsObject.colour,
        handle == highlighted ? colourHighlight : part.colour,
      );
    }

    this.thicknessMultiplier = 1.0;
  }

  private clearGeometry() {
    for (const part of this.parts.values()) {
      part.shape.clear();
    }
  }

  /** Remove the gizmo geometry from the scene. */
  destroy() {
    for (const part of this.parts.values()) {
      this.scene.deleteShape(part.shape);
    }
    this.parts.clear();
  }

  // ---- Geometry building ----

  /**
   * Emit one logical line as several parallel copies, so it reads as a thick
   * stroke. See lineThicknessPixels for why gl.lineWidth is not used.
   *
   * The copies are offset along a direction perpendicular to both the line and
   * the view ray, which is the direction that appears as "sideways" on screen.
   * That keeps the apparent thickness constant whatever angle the line is
   * viewed from, and avoids the copies hiding behind one another.
   */
  private appendThickLine(vertices: Array<vec3>, start: vec3, end: vec3) {
    const along = vec3.sub(vec3.create(), end, start);
    if (vec3.squaredLength(along) < 1e-12) {
      return;
    }
    vec3.normalize(along, along);

    // Direction from the camera to the middle of the line.
    const midPoint = vec3.lerp(vec3.create(), start, end, 0.5);
    const toCamera = vec3.sub(
      vec3.create(),
      this.camera.getPosition(),
      midPoint,
    );

    let sideways = vec3.cross(vec3.create(), along, toCamera);
    if (vec3.squaredLength(sideways) < 1e-12) {
      // Line points straight at the camera, any perpendicular will do.
      sideways = this.perpendicularAxes(along)[0];
    }
    vec3.normalize(sideways, sideways);

    // Convert the wanted pixel thickness into world units at this line's depth.
    const strokePixels = lineThicknessPixels * this.thicknessMultiplier;
    const pixelsPerWorldUnit = this.pixelsPerWorldUnitAt(midPoint);
    const thickness =
      pixelsPerWorldUnit > 0.0
        ? (strokePixels * 0.5) / pixelsPerWorldUnit
        : 0.0;

    // Enough copies that neighbours land under a pixel apart, so the stroke
    // reads as solid at any resolution.
    const copies = Math.min(
      maxLineCopies,
      Math.max(2, Math.ceil(strokePixels / lineCopySpacingPixels) + 1),
    );

    for (let i = 0; i < copies; i++) {
      // Spread the copies evenly across the full thickness, centred on the line.
      const t = copies == 1 ? 0.0 : (i / (copies - 1)) * 2.0 - 1.0;
      const offset = vec3.scale(vec3.create(), sideways, thickness * t);
      vertices.push(
        vec3.add(vec3.create(), start, offset),
        vec3.add(vec3.create(), end, offset),
      );
    }
  }

  /**
   * How many screen pixels one world unit covers at the depth of the given
   * point. Used to specify line thickness in pixels rather than world units.
   */
  private pixelsPerWorldUnitAt(point: vec3): number {
    const rect = this.scene.renderer.domElement.getClientRects()[0];
    if (rect == undefined) {
      return 0.0;
    }

    const toPoint = vec3.sub(vec3.create(), point, this.camera.getPosition());
    const depth = Math.abs(vec3.dot(toPoint, this.camera.getDir()));
    if (depth < 0.0001) {
      return 0.0;
    }

    const fovRadians = (this.camera.getFov() * Math.PI) / 180.0;
    const worldHeightAtDepth = 2.0 * depth * Math.tan(fovRadians * 0.5);
    return rect.height / worldHeightAtDepth;
  }

  private appendAxis(vertices: Array<vec3>, origin: vec3, handle: GizmoHandle) {
    const dir = axisDirections[handle];
    const tip = vec3.scaleAndAdd(vec3.create(), origin, dir, this.axisLength);

    this.appendThickLine(vertices, origin, tip);

    // A solid looking arrow head, built from lines fanned around the tip.
    const headLength = this.axisLength * 0.18;
    const headRadius = headLength * 0.45;
    const perpendiculars = this.perpendicularAxes(dir);
    const base = vec3.scaleAndAdd(vec3.create(), tip, dir, -headLength);

    const segments = 8;
    let previousRim: vec3 = null;
    let firstRim: vec3 = null;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2.0;
      let rim = vec3.scaleAndAdd(
        vec3.create(),
        base,
        perpendiculars[0],
        Math.cos(angle) * headRadius,
      );
      vec3.scaleAndAdd(
        rim,
        rim,
        perpendiculars[1],
        Math.sin(angle) * headRadius,
      );

      // Spoke from the rim up to the tip, which fills the cone in visually.
      this.appendThickLine(vertices, rim, tip);

      if (previousRim != null) {
        this.appendThickLine(vertices, previousRim, rim);
      } else {
        firstRim = vec3.clone(rim);
      }
      previousRim = rim;
    }
    if (previousRim != null && firstRim != null) {
      this.appendThickLine(vertices, previousRim, firstRim);
    }
  }

  private appendPlaneHandle(
    vertices: Array<vec3>,
    origin: vec3,
    handle: GizmoHandle,
  ) {
    const axes = planeAxes[handle];
    const offset = this.axisLength * planeHandleOffset;
    const size = this.axisLength * planeHandleSize;

    // Corner of the quad nearest the origin.
    let corner = vec3.scaleAndAdd(vec3.create(), origin, axes.first, offset);
    vec3.scaleAndAdd(corner, corner, axes.second, offset);

    const a = vec3.clone(corner);
    const b = vec3.scaleAndAdd(vec3.create(), corner, axes.first, size);
    const c = vec3.scaleAndAdd(vec3.create(), b, axes.second, size);
    const d = vec3.scaleAndAdd(vec3.create(), corner, axes.second, size);

    this.appendThickLine(vertices, a, b);
    this.appendThickLine(vertices, b, c);
    this.appendThickLine(vertices, c, d);
    this.appendThickLine(vertices, d, a);

    // A couple of diagonals so the quad reads as a filled surface rather than
    // an empty wire square, which is easy to miss against busy geometry.
    const across = vec3.lerp(vec3.create(), a, c, 0.5);
    this.appendThickLine(vertices, a, across);
    this.appendThickLine(vertices, across, c);
    this.appendThickLine(vertices, b, d);
  }

  private appendScreenHandle(vertices: Array<vec3>, origin: vec3) {
    // A small camera facing square at the object origin.
    const right = vec3.normalize(vec3.create(), this.camera.getRight());
    const up = vec3.normalize(vec3.create(), this.camera.getUp());
    const size = this.axisLength * screenHandleSize;

    let corners: Array<vec3> = [];
    for (const [rightSign, upSign] of [
      [1.0, 1.0],
      [-1.0, 1.0],
      [-1.0, -1.0],
      [1.0, -1.0],
    ]) {
      let corner = vec3.scaleAndAdd(
        vec3.create(),
        origin,
        right,
        size * rightSign,
      );
      vec3.scaleAndAdd(corner, corner, up, size * upSign);
      corners.push(corner);
    }

    for (let i = 0; i < corners.length; i++) {
      this.appendThickLine(
        vertices,
        corners[i],
        corners[(i + 1) % corners.length],
      );
    }

    // Diagonals through the middle, so the centre handle stays findable even
    // when it overlaps the origins of the three axes.
    this.appendThickLine(vertices, corners[0], corners[2]);
    this.appendThickLine(vertices, corners[1], corners[3]);
  }

  /**
   * Scale the gizmo with distance from the camera so it keeps a constant size
   * on screen. Uses the vertical FOV, matching how the projection matrix is built.
   */
  private calculateAxisLength(origin: vec3): number {
    const toObject = vec3.sub(vec3.create(), origin, this.camera.getPosition());
    // Distance along the view direction, so the size does not change as the
    // object slides toward the edge of the screen.
    const depth = Math.abs(vec3.dot(toObject, this.camera.getDir()));
    const fovRadians = (this.camera.getFov() * Math.PI) / 180.0;
    const worldHeightAtDepth = 2.0 * depth * Math.tan(fovRadians * 0.5);
    return Math.max(worldHeightAtDepth * this.screenSize, 0.0001);
  }

  private perpendicularAxes(dir: vec3): Array<vec3> {
    // dir is always one of the three cardinal axes here.
    if (Math.abs(dir[0]) > 0.5) {
      return [vec3.fromValues(0.0, 1.0, 0.0), vec3.fromValues(0.0, 0.0, 1.0)];
    }
    if (Math.abs(dir[1]) > 0.5) {
      return [vec3.fromValues(1.0, 0.0, 0.0), vec3.fromValues(0.0, 0.0, 1.0)];
    }
    return [vec3.fromValues(1.0, 0.0, 0.0), vec3.fromValues(0.0, 1.0, 0.0)];
  }

  private movableComponents(handle: GizmoHandle): [boolean, boolean, boolean] {
    switch (handle) {
      case GizmoHandle.X:
        return [true, false, false];
      case GizmoHandle.Y:
        return [false, true, false];
      case GizmoHandle.Z:
        return [false, false, true];
      case GizmoHandle.XY:
        return [true, true, false];
      case GizmoHandle.XZ:
        return [true, false, true];
      case GizmoHandle.YZ:
        return [false, true, true];
      default:
        return [true, true, true];
    }
  }

  // ---- Picking ----

  /**
   * Find which handle is under the cursor. Planar and screen handles are tested
   * before the axes, since they overlap the axis lines near the origin and are
   * the harder of the two to hit.
   */
  private pickHandle(mousePosition: vec2): GizmoHandle {
    const origin = this.target.position;
    this.axisLength = this.calculateAxisLength(origin);

    if (this.pickScreenHandle(mousePosition, origin)) {
      return GizmoHandle.SCREEN;
    }

    for (const handle of [GizmoHandle.XY, GizmoHandle.XZ, GizmoHandle.YZ]) {
      if (this.pickPlaneHandle(mousePosition, origin, handle)) {
        return handle;
      }
    }

    let closestHandle = GizmoHandle.NONE;
    let closestPixelDistance = pickPixelRadius;
    for (const handle of [GizmoHandle.X, GizmoHandle.Y, GizmoHandle.Z]) {
      const pixelDistance = this.axisPixelDistance(
        mousePosition,
        origin,
        handle,
      );
      if (pixelDistance != null && pixelDistance < closestPixelDistance) {
        closestPixelDistance = pixelDistance;
        closestHandle = handle;
      }
    }

    return closestHandle;
  }

  /**
   * Shortest distance in pixels from the cursor to an axis line, by projecting
   * the axis into screen space and doing the test in 2D. Doing it in screen
   * space keeps the grab radius constant regardless of the viewing angle.
   */
  private axisPixelDistance(
    mousePosition: vec2,
    origin: vec3,
    handle: GizmoHandle,
  ): number {
    const tip = vec3.scaleAndAdd(
      vec3.create(),
      origin,
      axisDirections[handle],
      this.axisLength,
    );

    const originScreen = this.worldToScreen(origin);
    const tipScreen = this.worldToScreen(tip);
    if (originScreen == null || tipScreen == null) {
      return null;
    }

    return this.pointToSegmentDistance2D(
      mousePosition,
      originScreen,
      tipScreen,
    );
  }

  private pickPlaneHandle(
    mousePosition: vec2,
    origin: vec3,
    handle: GizmoHandle,
  ): boolean {
    const axes = planeAxes[handle];
    const hit = this.rayPlaneIntersection(mousePosition, origin, axes.normal);
    if (hit == null) {
      return false;
    }

    const local = vec3.sub(vec3.create(), hit, origin);
    const along = vec3.dot(local, axes.first);
    const across = vec3.dot(local, axes.second);

    const min = this.axisLength * planeHandleOffset;
    const max = min + this.axisLength * planeHandleSize;

    return along >= min && along <= max && across >= min && across <= max;
  }

  private pickScreenHandle(mousePosition: vec2, origin: vec3): boolean {
    const originScreen = this.worldToScreen(origin);
    if (originScreen == null) {
      return false;
    }
    return vec2.distance(mousePosition, originScreen) <= pickPixelRadius;
  }

  // ---- Drag projection ----

  /**
   * Map the cursor to a world position constrained by the grabbed handle.
   */
  private projectMouseOntoHandle(
    mousePosition: vec2,
    handle: GizmoHandle,
  ): vec3 {
    const origin =
      this.activeHandle == GizmoHandle.NONE
        ? this.target.position
        : this.dragStartPosition;

    if (handle == GizmoHandle.SCREEN) {
      // Move in the plane facing the camera.
      const normal = vec3.negate(vec3.create(), this.camera.getDir());
      return this.rayPlaneIntersection(mousePosition, origin, normal);
    }

    if (planeAxes[handle] != undefined) {
      return this.rayPlaneIntersection(
        mousePosition,
        origin,
        planeAxes[handle].normal,
      );
    }

    return this.closestPointOnAxis(
      mousePosition,
      origin,
      axisDirections[handle],
    );
  }

  /**
   * Intersect the mouse ray with an infinite plane through planeOrigin.
   * Returns null when the ray is parallel to the plane, which is the degenerate
   * case where a drag would otherwise fly off to infinity.
   */
  private rayPlaneIntersection(
    mousePosition: vec2,
    planeOrigin: vec3,
    planeNormal: vec3,
  ): vec3 {
    const ray = this.getMouseRay(mousePosition);
    if (ray == null) {
      return null;
    }

    const denominator = vec3.dot(ray.dir, planeNormal);
    if (Math.abs(denominator) < 0.0001) {
      return null;
    }

    const toPlane = vec3.sub(vec3.create(), planeOrigin, ray.start);
    const distance = vec3.dot(toPlane, planeNormal) / denominator;
    if (distance < 0.0) {
      // Plane is behind the camera.
      return null;
    }

    return vec3.scaleAndAdd(vec3.create(), ray.start, ray.dir, distance);
  }

  /**
   * Closest point on the infinite axis line to the mouse ray, which is the
   * standard closest approach of two skew lines.
   */
  private closestPointOnAxis(
    mousePosition: vec2,
    axisOrigin: vec3,
    axisDir: vec3,
  ): vec3 {
    const ray = this.getMouseRay(mousePosition);
    if (ray == null) {
      return null;
    }

    const between = vec3.sub(vec3.create(), axisOrigin, ray.start);
    const axisDotRay = vec3.dot(axisDir, ray.dir);
    const denominator = 1.0 - axisDotRay * axisDotRay;

    // Axis is pointing almost straight at the camera, the solution is unstable.
    if (Math.abs(denominator) < 0.0001) {
      return null;
    }

    const alongAxis =
      (vec3.dot(between, ray.dir) * axisDotRay - vec3.dot(between, axisDir)) /
      denominator;

    return vec3.scaleAndAdd(vec3.create(), axisOrigin, axisDir, alongAxis);
  }

  /**
   * Build a normalized mouse ray in world space.
   *
   * Note that this deliberately does not reuse MousePicking.GetRay: Ray.getDir
   * returns an unnormalized direction on purpose, to preserve distances for the
   * octree raycasts, and Ray exposes no getter for its start. The gizmo maths
   * below needs a genuine unit direction, so the unprojection is done here.
   */
  private getMouseRay(mousePosition: vec2): { start: vec3; dir: vec3 } {
    const rect = this.scene.renderer.domElement.getClientRects()[0];
    if (rect == undefined) {
      return null;
    }

    const ndc = vec2.fromValues(
      ((mousePosition[0] - rect.left) / rect.width) * 2.0 - 1.0,
      ((mousePosition[1] - rect.top) / rect.height) * -2.0 + 1.0,
    );

    let clip = vec4.fromValues(ndc[0], ndc[1], -1.0, 1.0);
    let viewSpace = vec4.transformMat4(
      vec4.create(),
      clip,
      mat4.invert(mat4.create(), this.camera.getProjectionMatrix()),
    );
    viewSpace[2] = -1.0;
    viewSpace[3] = 0.0;

    const worldSpace = vec4.transformMat4(
      vec4.create(),
      viewSpace,
      mat4.invert(mat4.create(), this.camera.getViewMatrix()),
    );

    const dir = vec3.normalize(
      vec3.create(),
      vec3.fromValues(worldSpace[0], worldSpace[1], worldSpace[2]),
    );

    return { start: vec3.clone(this.camera.getPosition()), dir: dir };
  }

  /**
   * Project a world position to client pixel coordinates, matching the space
   * mouse events arrive in. Returns null if the point is behind the camera.
   */
  private worldToScreen(world: vec3): vec2 {
    const rect = this.scene.renderer.domElement.getClientRects()[0];
    if (rect == undefined) {
      return null;
    }

    let clip = vec4.transformMat4(
      vec4.create(),
      vec4.fromValues(world[0], world[1], world[2], 1.0),
      this.camera.getViewProjMatrix(),
    );

    if (clip[3] <= 0.0001) {
      return null;
    }

    const ndcX = clip[0] / clip[3];
    const ndcY = clip[1] / clip[3];

    return vec2.fromValues(
      rect.left + (ndcX + 1.0) * 0.5 * rect.width,
      rect.top + (1.0 - ndcY) * 0.5 * rect.height,
    );
  }

  private pointToSegmentDistance2D(
    point: vec2,
    start: vec2,
    end: vec2,
  ): number {
    const segment = vec2.sub(vec2.create(), end, start);
    const lengthSquared = vec2.squaredLength(segment);
    if (lengthSquared < 0.0001) {
      return vec2.distance(point, start);
    }

    let t =
      vec2.dot(vec2.sub(vec2.create(), point, start), segment) / lengthSquared;
    t = Math.max(0.0, Math.min(1.0, t));

    const closest = vec2.scaleAndAdd(vec2.create(), start, segment, t);
    return vec2.distance(point, closest);
  }
}
