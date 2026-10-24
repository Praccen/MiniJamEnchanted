import Camera from "../../../Objects/Camera.js";
import ScreenQuad from "../../../Objects/GraphicsObjects/ScreenQuad.js";

import Texture from "../../../AssetHandling/Textures/Texture.js";
import Scene from "../../Scene.js";
import LightingPassShaderProgram from "../../ShaderPrograms/DeferredRendering/LightingPassShaderProgram.js";
import {
  pointLightsToAllocate,
  pointShadowsToAllocate,
} from "../../RendererBase.js";

export default class LightingRenderPass {
  private gl: WebGL2RenderingContext;
  private screenQuad: ScreenQuad;
  private lightingPassShaderProgram: LightingPassShaderProgram;

  constructor(
    gl: WebGL2RenderingContext,
    lightingPassShaderProgram: LightingPassShaderProgram,
    inputTextures: Texture[],
  ) {
    this.gl = gl;
    this.lightingPassShaderProgram = lightingPassShaderProgram;
    this.screenQuad = new ScreenQuad(this.gl, inputTextures);
  }

  draw(scene: Scene, camera: Camera) {
    // Disable depth testing for screen quad(s) rendering
    this.gl.disable(this.gl.DEPTH_TEST);

    // ---- Lighting pass ----
    this.lightingPassShaderProgram.use();

    this.gl.uniform3fv(
      this.lightingPassShaderProgram.getUniformLocation("camPos")[0],
      camera.getPosition(),
    );
    scene.directionalLight.bind(this.gl, this.lightingPassShaderProgram);
    scene.directionalLight.sendLightSpaceMatrix(
      this.gl,
      this.lightingPassShaderProgram.getUniformLocation("lightSpaceMatrix")[0],
    );
    // Point lights
    this.gl.uniform1i(
      this.lightingPassShaderProgram.getUniformLocation("nrOfPointLights")[0],
      Math.min(scene.pointLights.length, pointLightsToAllocate),
    );

    // Bind pointLights, with counter as depthMapIndex
    let counter = 0;
    for (
      let i = 0;
      i < scene.pointLights.length && i < pointLightsToAllocate;
      i++
    ) {
      scene.pointLights[i].bind(i, counter, this.lightingPassShaderProgram);
      if (scene.pointLights[i].castShadow) {
        counter++;
      }
    }

    // Bind all textures except the point light depth maps
    for (let i = 0; i < this.screenQuad.textures.length; i++) {
      this.screenQuad.textures[i].bind(i);
    }

    // Then bind the point light depth maps
    counter = this.screenQuad.textures.length;
    for (
      let i = 0;
      i < scene.pointLights.length && i < pointLightsToAllocate;
      i++
    ) {
      if (counter - this.screenQuad.textures.length >= pointShadowsToAllocate) {
        break;
      }
      if (scene.pointLights[i].castShadow) {
        scene.pointLights[i].pointShadowDepthMap.bind(counter++);
      }
    }

    this.screenQuad.draw(this.lightingPassShaderProgram, false);
    // -----------------------

    // Enable depth test again
    this.gl.enable(this.gl.DEPTH_TEST);
  }
}
