import { mat4, vec3, vec4 } from "gl-matrix";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";
import OBB from "../../../Physics/Physics/Shapes/OBB.js";
import Shape from "../../../Physics/Physics/Shapes/Shape.js";

export default class DirectionalLight {
  direction: vec3;
  colour: vec3;
  ambientMultiplier: number;
  shadowFocusPos: vec3;
  shadowCameraDistance: number;
  lightProjectionBoxSideLength: number;

  private lightSpaceMatrix: mat4;
  private frustum: OBB;

  constructor() {
    this.direction = vec3.fromValues(0.0, -1.0, -0.5);
    this.colour = vec3.fromValues(0.2, 0.2, 0.2);
    this.ambientMultiplier = 0.1;
    this.lightProjectionBoxSideLength = 60.0;
    this.shadowFocusPos = vec3.create();
    this.shadowCameraDistance = 40.0;
    this.lightSpaceMatrix = mat4.create();
    this.frustum = new OBB();
    this.frustum.setMinAndMaxVectors(
      vec3.fromValues(-1, -1, -1),
      vec3.fromValues(1, 1, 1),
    );
  }

  bind(gl: WebGL2RenderingContext, shaderProgram: ShaderProgram) {
    gl.uniform3fv(
      shaderProgram.getUniformLocation("directionalLight.direction")[0],
      vec3.normalize(this.direction, this.direction),
    );
    gl.uniform3fv(
      shaderProgram.getUniformLocation("directionalLight.colour")[0],
      this.colour,
    );
    gl.uniform1f(
      shaderProgram.getUniformLocation("directionalLight.ambientMultiplier")[0],
      this.ambientMultiplier,
    );
  }

  sendLightSpaceMatrix(
    gl: WebGL2RenderingContext,
    uniformLocation: WebGLUniformLocation,
  ) {
    gl.uniformMatrix4fv(uniformLocation, false, this.lightSpaceMatrix);
  }

  calcAndSendLightSpaceMatrix(
    gl: WebGL2RenderingContext,
    uniformLocation: WebGLUniformLocation,
  ) {
    let cameraPos = vec3.clone(this.shadowFocusPos);
    let offsetVec = vec3.scale(
      vec3.create(),
      vec3.normalize(vec3.create(), this.direction),
      this.shadowCameraDistance,
    );
    this.lightSpaceMatrix = mat4.ortho(
      mat4.create(),
      -this.lightProjectionBoxSideLength,
      this.lightProjectionBoxSideLength,
      -this.lightProjectionBoxSideLength,
      this.lightProjectionBoxSideLength,
      0.1,
      this.shadowCameraDistance * 2.0,
    ); // Start by setting it to projection
    vec3.subtract(cameraPos, cameraPos, offsetVec);
    let lightView = mat4.lookAt(
      mat4.create(),
      cameraPos,
      this.shadowFocusPos,
      vec3.fromValues(0.0, 1.0, 0.0),
    ); // This will make it impossible to have exactly straight down shadows, but I'm fine with that
    mat4.mul(this.lightSpaceMatrix, this.lightSpaceMatrix, lightView);
    gl.uniformMatrix4fv(uniformLocation, false, this.lightSpaceMatrix);
    this.frustum.setTransformMatrix(
      mat4.invert(mat4.create(), this.lightSpaceMatrix),
    );
  }

  getFrustum(): Shape {
    return this.frustum;
  }
}
