import { mat3, mat4, quat, vec3 } from "gl-matrix";

/**
 * A utility class that can store position, rotation, scle, and origin.
 * It has a function "calculateMatrix", which takes a matrix, and will update the matrix with the member variables
 */
export default class Transform {
  parentTransform: Transform;

  enabled: boolean = true;

  position: vec3;
  rotation: quat;
  scale: vec3;
  origin: vec3;
  matrix: mat4;
  normalMatrix: mat3;

  constructor() {
    this.parentTransform = null;
    this.position = vec3.create();
    this.rotation = quat.create();
    this.scale = vec3.fromValues(1.0, 1.0, 1.0);
    this.origin = vec3.create();
    this.matrix = mat4.create();
    this.normalMatrix = mat3.create();
  }

  clone(transform: Transform) {
    transform.parentTransform = this.parentTransform;
    transform.enabled = this.enabled;
    vec3.copy(transform.position, this.position);
    quat.copy(transform.rotation, this.rotation);
    vec3.copy(transform.scale, this.scale);
    vec3.copy(transform.origin, this.origin);
    mat4.copy(transform.matrix, this.matrix);
    mat3.copy(transform.normalMatrix, this.normalMatrix);
  }

  translate(translation: vec3) {
    if (
      Number.isNaN(translation[0]) ||
      Number.isNaN(translation[1]) ||
      Number.isNaN(translation[2])
    ) {
      return;
    }
    vec3.add(this.position, this.position, translation);
  }

  setTranslation(translation: vec3) {
    if (
      Number.isNaN(translation[0]) ||
      Number.isNaN(translation[1]) ||
      Number.isNaN(translation[2])
    ) {
      return;
    }
    vec3.copy(this.position, translation);
  }

  calculateAnimationMatrix(
    matrix: mat4 = this.matrix,
    identityMatrixFirst: boolean = true
  ) {
    if (identityMatrixFirst) {
      mat4.identity(matrix);
    }

    if (this.parentTransform != undefined) {
      this.parentTransform.calculateAnimationMatrix(matrix, false);
    }

    mat4.translate(matrix, matrix, this.position);
    mat4.multiply(matrix, matrix, mat4.fromQuat(mat4.create(), this.rotation));
    mat4.scale(matrix, matrix, this.scale);
  }

  calculateMatrices(
    matrix: mat4 = this.matrix,
    normalMatrix: mat3 = this.normalMatrix,
    identityMatrixFirst: boolean = true
  ) {
    if (identityMatrixFirst) {
      mat4.identity(matrix);
    }

    if (this.parentTransform != undefined) {
      this.parentTransform.calculateMatrices(matrix, normalMatrix, false);
    }
    mat4.translate(matrix, matrix, this.position);
    mat4.multiply(matrix, matrix, mat4.fromQuat(mat4.create(), this.rotation));
    mat4.scale(matrix, matrix, this.scale);
    mat4.translate(matrix, matrix, vec3.negate(vec3.create(), this.origin));

    mat3.normalFromMat4(normalMatrix, matrix);
  }
}
