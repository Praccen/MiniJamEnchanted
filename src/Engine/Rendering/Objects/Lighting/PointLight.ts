import { vec3 } from "gl-matrix";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";
import CubeMap from "../../AssetHandling/Textures/CubeMap.js";
import Framebuffer from "../../Renderer/Framebuffers/Framebuffer.js";
import Shape from "../../../Physics/Physics/Shapes/Shape.js";
import OBB from "../../../Physics/Physics/Shapes/OBB.js";

export default class PointLight {
  private gl: WebGL2RenderingContext;

  position: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
  offset: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
  colour: vec3 = vec3.fromValues(1.0, 1.0, 1.0);

  constant: number = 1.0;
  linear: number = 0.07;
  quadratic: number = 0.017;
  castShadow: boolean = false;
  // depthMapGenerated: boolean;
  // private radius: number; // TODO: implement light volumes

  pointShadowBuffer: Framebuffer;
  pointShadowDepthMap: CubeMap;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // this.depthMapGenerated = false;
    // this.radius = (-this.linear + Math.sqrt(this.linear * this.linear - 4.0 * this.quadratic * (this.constant - (256.0 / 5.0)))) / (2.0 * this.quadratic);

    this.pointShadowDepthMap = new CubeMap(
      this.gl,
      false,
      this.gl.DEPTH_COMPONENT32F,
      this.gl.DEPTH_COMPONENT,
      this.gl.FLOAT
    );
    this.pointShadowDepthMap.setTextureData(null, 501, 501);

    this.pointShadowBuffer = new Framebuffer(
      this.gl,
      501,
      501,
      [],
      this.pointShadowDepthMap
    );
  }

  reset() {
    this.position = vec3.fromValues(0.0, 0.0, 0.0);
    this.offset = vec3.fromValues(0.0, 0.0, 0.0);
    this.colour = vec3.fromValues(1.0, 1.0, 1.0);

    this.constant = 1.0;
    this.linear = 0.07;
    this.quadratic = 0.017;
    this.castShadow = false;
  }

  setShadowBufferResolution(res: number) {
    this.pointShadowBuffer.setProportions(res, res);
  }

  bind(
    lightIndex: number,
    depthMapIndex: number,
    shaderProgram: ShaderProgram
  ) {
    let ul = shaderProgram.getUniformLocation(
      "pointLights[" + lightIndex + "].position"
    );
    if (ul[1]) {
      this.gl.uniform3fv(
        ul[0],
        vec3.add(vec3.create(), this.position, this.offset)
      );
    }
    ul = shaderProgram.getUniformLocation(
      "pointLights[" + lightIndex + "].colour"
    );
    if (ul[1]) {
      this.gl.uniform3fv(ul[0], this.colour);
    }

    ul = shaderProgram.getUniformLocation(
      "pointLights[" + lightIndex + "].constant"
    );
    if (ul[1]) {
      this.gl.uniform1f(ul[0], this.constant);
    }
    ul = shaderProgram.getUniformLocation(
      "pointLights[" + lightIndex + "].linear"
    );
    if (ul[1]) {
      this.gl.uniform1f(ul[0], this.linear);
    }
    ul = shaderProgram.getUniformLocation(
      "pointLights[" + lightIndex + "].quadratic"
    );
    if (ul[1]) {
      this.gl.uniform1f(ul[0], this.quadratic);
    }

    ul = shaderProgram.getUniformLocation(
      "pointLights[" + lightIndex + "].pointDepthMapIndex"
    );
    if (ul[1]) {
      this.gl.uniform1i(ul[0], this.castShadow ? depthMapIndex : -1);
    }
  }

  getFrustum(): Shape {
    let radius =
      (-this.linear +
        Math.sqrt(
          this.linear * this.linear -
            4.0 * this.quadratic * (this.constant - 256.0 / 5.0)
        )) /
      (2.0 * this.quadratic);
    let obb = new OBB();
    obb.setMinAndMaxVectors(
      vec3.add(
        vec3.create(),
        vec3.add(vec3.create(), this.position, this.offset),
        vec3.fromValues(-radius, -radius, -radius)
      ),
      vec3.add(
        vec3.create(),
        vec3.add(vec3.create(), this.position, this.offset),
        vec3.fromValues(radius, radius, radius)
      )
    );
    return obb;
  }
}
