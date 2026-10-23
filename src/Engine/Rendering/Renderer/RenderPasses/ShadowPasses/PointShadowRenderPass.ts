import { vec3 } from "gl-matrix";
import Scene from "../../Scene.js";
import Camera from "../../../Objects/Camera.js";
import {
  pointLightsToAllocate,
  pointShadowsToAllocate,
} from "../../RendererBase.js";
import PointShadowShaderProgram from "../../ShaderPrograms/ShadowMapping/PointShadowShaderProgram.js";
import PointShadowInstancedShaderProgram from "../../ShaderPrograms/ShadowMapping/PointShadowInstancedShaderProgram.js";
import PointShadowSkeletalAnimationShaderProgram from "../../ShaderPrograms/ShadowMapping/PointShadowSkeletalAnimationShaderProgram.js";
import { IntersectionTester } from "../../../../Physics/Physics/IntersectionTester.js";
import Shape from "../../../../Physics/Physics/Shapes/Shape.js";

export default class PointShadowRenderPass {
  private gl: WebGL2RenderingContext;

  private pointShadowShaderProgram: PointShadowShaderProgram;
  private pointShadowInstancedShaderProgram: PointShadowInstancedShaderProgram;
  private pointShadowSkeletalAnimationShaderProgram: PointShadowSkeletalAnimationShaderProgram;

  private frameCounter: number;

  private frustumShapes: Array<Shape> = [];

  constructor(
    gl: WebGL2RenderingContext,
    pointShadowShaderProgram: PointShadowShaderProgram,
    pointShadowInstancedShaderProgram: PointShadowInstancedShaderProgram,
    pointShadowSkeletalAnimationShaderProgram: PointShadowSkeletalAnimationShaderProgram
  ) {
    this.pointShadowShaderProgram = pointShadowShaderProgram;
    this.pointShadowInstancedShaderProgram = pointShadowInstancedShaderProgram;
    this.pointShadowSkeletalAnimationShaderProgram =
      pointShadowSkeletalAnimationShaderProgram;
    this.gl = gl;
  }

  draw(scene: Scene, cameraFrustum: Shape) {
    // for (const frustumShape of this.frustumShapes) {
    //   scene.deleteShape(frustumShape);
    // }

    // this.frustumShapes.length = 0;

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.FRONT);

    let pointLightCamera = new Camera();
    pointLightCamera.setFOV(90);
    pointLightCamera.setAspectRatio(1);
    pointLightCamera.setFarPlaneDistance(35.0);

    const directions = [
      vec3.fromValues(1.0, 0.0, 0.0),
      vec3.fromValues(-1.0, 0.0, 0.0),
      vec3.fromValues(0.0, -1.0, 0.0),
      vec3.fromValues(0.0, 1.0, 0.0),
      vec3.fromValues(0.0, 0.0, -1.0),
      vec3.fromValues(0.0, 0.0, 1.0),
    ];
    const ups = [
      vec3.fromValues(0.0, 1.0, 0.0),
      vec3.fromValues(0.0, 1.0, 0.0),
      vec3.fromValues(0.0, 0.0, -1.0),
      vec3.fromValues(0.0, 0.0, 1.0),
      vec3.fromValues(0.0, 1.0, 0.0),
      vec3.fromValues(0.0, 1.0, 0.0),
    ];

    let counter = 0;
    for (
      let i = 0;
      i < scene.pointLights.length && i < pointLightsToAllocate;
      i++
    ) {
      if (counter >= pointShadowsToAllocate) {
        break;
      }
      const pointLight = scene.pointLights[i];

      if (pointLight.castShadow /*&& !pointLight.depthMapGenerated*/) {
        counter++;
        // pointLight.depthMapGenerated = true;

        const pointLightFrustum = pointLight.getFrustum();

        if (
          !IntersectionTester.identifyIntersection(
            [cameraFrustum],
            [pointLightFrustum]
          )
        ) {
          continue;
        }

        pointLightCamera.setPosition(
          vec3.add(vec3.create(), pointLight.position, pointLight.offset)
        );

        this.gl.viewport(
          0,
          0,
          pointLight.pointShadowBuffer.getWidth(),
          pointLight.pointShadowBuffer.getHeight()
        );
        pointLight.pointShadowBuffer.bind(this.gl.FRAMEBUFFER);

        for (let i = 0; i < directions.length; i++) {
          pointLightCamera.setDir(directions[i]);
          pointLightCamera.setUp(ups[i]);
          this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.DEPTH_ATTACHMENT,
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
            pointLight.pointShadowDepthMap.texture,
            0
          );

          // ---- Shadow pass ----
          this.pointShadowShaderProgram.use();

          //Set uniforms
          pointLightCamera.bindViewProjMatrix(
            this.gl,
            this.pointShadowShaderProgram.getUniformLocation(
              "lightSpaceMatrix"
            )[0]
          );

          // this.frustumShapes.push(new Frustum());
          // this.frustumShapes[this.frustumShapes.length - 1].setTransformMatrix(mat4.invert(mat4.create(), pointLightCamera.getViewProjMatrix()));
          // scene.addNewShape(this.frustumShapes[this.frustumShapes.length - 1]);

          if (
            !IntersectionTester.identifyIntersection(
              [cameraFrustum],
              [pointLightCamera.getFrustum()]
            )
          ) {
            // The pointLight frustum can't be seen from the camera, no need to render this side of the depth cube
            continue;
          }

          this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

          this.gl.uniform3fv(
            this.pointShadowShaderProgram.getUniformLocation("cameraPos")[0],
            pointLightCamera.getPosition()
          );

          //Render shadow pass
          scene.renderScene(this.pointShadowShaderProgram);

          // Instanced
          this.pointShadowInstancedShaderProgram.use();

          //Set uniforms
          pointLightCamera.bindViewProjMatrix(
            this.gl,
            this.pointShadowInstancedShaderProgram.getUniformLocation(
              "lightSpaceMatrix"
            )[0]
          );
          this.gl.uniform3fv(
            this.pointShadowInstancedShaderProgram.getUniformLocation(
              "cameraPos"
            )[0],
            pointLightCamera.getPosition()
          );

          //Render shadow pass
          scene.renderSceneInstanced(this.pointShadowInstancedShaderProgram);

          // Animated
          this.pointShadowSkeletalAnimationShaderProgram.use();

          //Set uniforms
          pointLightCamera.bindViewProjMatrix(
            this.gl,
            this.pointShadowSkeletalAnimationShaderProgram.getUniformLocation(
              "lightSpaceMatrix"
            )[0]
          );
          this.gl.uniform3fv(
            this.pointShadowSkeletalAnimationShaderProgram.getUniformLocation(
              "cameraPos"
            )[0],
            pointLightCamera.getPosition()
          );

          //Render shadow pass
          scene.renderSceneAnimated(
            this.pointShadowSkeletalAnimationShaderProgram
          );
        }
      }
    }

    this.gl.disable(this.gl.CULL_FACE);
  }
}
