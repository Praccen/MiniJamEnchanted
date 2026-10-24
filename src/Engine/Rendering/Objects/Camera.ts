import { ReadonlyVec3, mat4, vec3, vec2 } from "gl-matrix";
import Shape from "../../Physics/Physics/Shapes/Shape.js";
import OBB from "../../Physics/Physics/Shapes/OBB.js";
import { vec4 } from "../../../Engine.js";
import Frustum from "../../Physics/Physics/Shapes/Frustum.js";

export default class Camera {
  private pos: vec3;
  private dir: vec3;
  private up: vec3;
  private fov: number;
  private ratio: number;
  private farPlaneDistance: number;
  private orthogonal: boolean;
  private left: number;
  private right: number;
  private bottom: number;
  private top: number;
  private viewMatrixNeedsUpdate: boolean;
  private projMatrixNeedsUpdate: boolean;
  private viewMatrix: mat4;
  private projectionMatrix: mat4;
  private viewProjMatrix: mat4;

  private frustum: Frustum;

  constructor() {
    // ----View----
    this.pos = vec3.create();
    this.dir = vec3.fromValues(0.0, 0.0, -1.0);
    this.up = vec3.fromValues(0.0, 1.0, 0.0);
    this.viewMatrix = mat4.create();
    this.viewMatrixNeedsUpdate = true;
    // ------------

    // ----Proj----
    this.projectionMatrix = mat4.create();
    this.projMatrixNeedsUpdate = true;
    this.ratio = 16.0 / 9.0;
    this.fov = (85.0 * Math.PI) / 180;
    this.farPlaneDistance = 1000.0;
    this.orthogonal = false;
    this.left = -1;
    this.right = 1;
    this.bottom = -1;
    this.top = 1;
    // ------------

    this.viewProjMatrix = mat4.create();

    this.frustum = new Frustum();
  }

  getViewProjMatrix(): mat4 {
    this.updateViewProjMatrix();
    return this.viewProjMatrix;
  }

  getViewMatrix(): mat4 {
    this.updateViewProjMatrix();
    return this.viewMatrix;
  }

  getProjectionMatrix(): mat4 {
    this.updateViewProjMatrix();
    return this.projectionMatrix;
  }

  getFov(): number {
    return this.fov;
  }

  getPosition(): vec3 {
    return this.pos;
  }

  getDir(): ReadonlyVec3 {
    return this.dir;
  }

  getPitchJawDegrees(): vec2 {
    return vec2.fromValues(
      (Math.asin(this.dir[1]) * 180) / Math.PI,
      (Math.atan2(this.dir[0], this.dir[2]) * 180) / Math.PI,
    );
  }

  getRight(): vec3 {
    let returnVec = vec3.create();
    vec3.cross(returnVec, this.dir, this.up);
    vec3.normalize(returnVec, returnVec);
    return returnVec;
  }

  getUp(): vec3 {
    let returnVec = vec3.create();
    vec3.cross(returnVec, this.getRight(), this.dir);
    vec3.normalize(returnVec, returnVec);
    return returnVec;
  }

  /**
   *
   * @param frustum Optional, if a frustum is passed here the parameter frustum will be updated with the camera viewprojmatrix
   * @returns the camera frustum if no parameter is passed, otherwise the frustum passed as a parameter
   */
  getFrustum(frustum?: Frustum): Shape {
    this.updateViewProjMatrix();
    if (frustum != undefined) {
      frustum.setTransformMatrix(
        mat4.invert(mat4.create(), this.viewProjMatrix),
      );
      return frustum;
    }
    return this.frustum;
  }

  setPosition(pos: ReadonlyVec3) {
    vec3.copy(this.pos, pos);
    this.viewMatrixNeedsUpdate = true;
  }

  translate(translation: ReadonlyVec3) {
    vec3.add(this.pos, this.pos, translation);
    this.viewMatrixNeedsUpdate = true;
  }

  setDir(dir: vec3) {
    vec3.normalize(this.dir, dir);
    this.viewMatrixNeedsUpdate = true;
  }

  setUp(up: vec3) {
    vec3.normalize(this.up, up);
    this.viewMatrixNeedsUpdate = true;
  }

  setPitchJawDegrees(pitch: number, jaw: number) {
    vec3.set(
      this.dir,
      Math.cos((pitch * Math.PI) / 180) * Math.sin((jaw * Math.PI) / 180),
      Math.sin((pitch * Math.PI) / 180),
      Math.cos((pitch * Math.PI) / 180) * Math.cos((jaw * Math.PI) / 180),
    );
    this.viewMatrixNeedsUpdate = true;
  }

  setPitchJawRadians(pitch: number, jaw: number) {
    vec3.set(
      this.dir,
      Math.cos(pitch) * Math.sin(jaw),
      Math.sin(pitch),
      Math.cos(pitch) * Math.cos(jaw),
    );
    this.viewMatrixNeedsUpdate = true;
  }

  setFOV(fov: number) {
    this.fov = (fov * Math.PI) / 180.0;
    this.projMatrixNeedsUpdate = true;
  }

  setAspectRatio(ratio: number) {
    this.ratio = ratio;
    this.projMatrixNeedsUpdate = true;
  }

  setFarPlaneDistance(distance: number) {
    this.farPlaneDistance = distance;
    this.projMatrixNeedsUpdate = true;
  }

  setOrthogonal(enabled: boolean) {
    this.orthogonal = enabled;
    this.projMatrixNeedsUpdate = true;
  }

  setOrthogonalDimensions(
    left: number,
    right: number,
    bottom: number,
    top: number,
  ) {
    this.left = left;
    this.right = right;
    this.bottom = bottom;
    this.top = top;
    this.projMatrixNeedsUpdate = true;
  }

  private updateViewProjMatrix() {
    let updateViewProj = false;
    if (this.viewMatrixNeedsUpdate) {
      mat4.lookAt(
        this.viewMatrix,
        this.pos,
        vec3.add(vec3.create(), this.pos, this.dir),
        this.up,
      );
      this.viewMatrixNeedsUpdate = false;
      updateViewProj = true;
    }

    if (this.projMatrixNeedsUpdate) {
      if (this.orthogonal) {
        mat4.ortho(
          this.projectionMatrix,
          this.left,
          this.right,
          this.bottom,
          this.top,
          0.01,
          this.farPlaneDistance,
        );
      } else {
        mat4.perspective(
          this.projectionMatrix,
          this.fov,
          this.ratio,
          0.01,
          this.farPlaneDistance,
        );
      }
    }
    this.projMatrixNeedsUpdate = false;
    updateViewProj = true;

    if (updateViewProj) {
      mat4.mul(this.viewProjMatrix, this.projectionMatrix, this.viewMatrix);

      // this.frustum.setTransformMatrix(mat4.mul(mat4.create(), mat4.invert(mat4.create(), this.projectionMatrix), this.viewMatrix));
      this.frustum.setTransformMatrix(
        mat4.invert(mat4.create(), this.viewProjMatrix),
      );
    }
  }

  bindViewProjMatrix(
    gl: WebGL2RenderingContext,
    uniformLocation: WebGLUniformLocation,
    skybox: boolean = false,
  ) {
    this.updateViewProjMatrix();

    if (skybox) {
      let tempViewMatrix = mat4.lookAt(
        mat4.create(),
        vec3.create(),
        this.dir,
        this.up,
      );
      let tempViewProj = mat4.mul(
        mat4.create(),
        this.projectionMatrix,
        tempViewMatrix,
      );

      gl.uniformMatrix4fv(uniformLocation, false, tempViewProj);
    } else {
      gl.uniformMatrix4fv(uniformLocation, false, this.viewProjMatrix);
    }
  }

  worldToScreenPosition(worldPos: vec3): vec2 | null {
    const pos = vec4.fromValues(worldPos[0], worldPos[1], worldPos[2], 1.0);
    const viewProjMatrix = this.getViewProjMatrix();
    const screenCoords = vec4.transformMat4(vec4.create(), pos, viewProjMatrix);

    const screenX = (screenCoords[0] / screenCoords[3] + 1.0) / 2.0;
    const screenY = 1.0 - (screenCoords[1] / screenCoords[3] + 1.0) / 2.0;

    if (screenCoords[2] > 0.0) {
      return vec2.fromValues(screenX, screenY);
    }
    return null;
  }
}
