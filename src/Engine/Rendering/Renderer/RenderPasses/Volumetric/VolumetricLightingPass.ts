import Camera from "../../../Objects/Camera.js";
import Framebuffer from "../../Framebuffers/Framebuffer.js";
import Scene from "../../Scene.js";
import Texture from "../../../AssetHandling/Textures/Texture.js";
import {
  pointLightsToAllocate,
  pointShadowsToAllocate,
} from "../../RendererBase.js";
import ScreenQuad from "../../../Objects/GraphicsObjects/ScreenQuad.js";
import VolumetricLightingShaderProgram from "../../ShaderPrograms/Volumetric/VolumetricLightingShaderProgram.js";
import VolumetricCombineShaderProgram from "../../ShaderPrograms/Volumetric/VolumetricCombineShaderProgram.js";
import ScreenQuadShaderProgram from "../../ShaderPrograms/ScreenQuadShaderProgram.js";
import { applicationStartTime } from "../../../../../Engine.js";

export default class VolumetricLightingPass {
  private gl: WebGL2RenderingContext;
  private volumetricLightingShaderProgram: VolumetricLightingShaderProgram;
  private volumetricCombineShaderProgram: VolumetricCombineShaderProgram;
  private screenQuadShaderProgram: ScreenQuadShaderProgram;

  outputBuffer: Framebuffer;
  fogMaxDistance: number;
  fogDensity: number;

  renderScale: number;
  blur: boolean;
  upscaleFramebuffer: Framebuffer;

  private width: number;
  private height: number;

  private volumetricScreenQuad: ScreenQuad;
  private combineScreenQuad: ScreenQuad;

  constructor(
    gl: WebGL2RenderingContext,
    volumetricLightingShaderProgram: VolumetricLightingShaderProgram,
    volumetricCombineShaderProgram: VolumetricCombineShaderProgram,
    screenQuadShaderProgram: ScreenQuadShaderProgram,
    positionTexture: Texture,
    fogTexture: Texture,
    directionalDepthMap: Texture
  ) {
    this.gl = gl;
    this.volumetricLightingShaderProgram = volumetricLightingShaderProgram;
    this.volumetricCombineShaderProgram = volumetricCombineShaderProgram;
    this.screenQuadShaderProgram = screenQuadShaderProgram;
    this.outputBuffer = null;
    this.fogMaxDistance = 100;
    this.fogDensity = 0.2;
    this.renderScale = 0.5;
    this.blur = false;
    this.width = 100;
    this.height = 100;
    this.volumetricScreenQuad = new ScreenQuad(this.gl, [
      positionTexture,
      fogTexture,
      directionalDepthMap,
    ]);
    this.upscaleFramebuffer = new Framebuffer(
      this.gl,
      100,
      100,
      [new Texture(this.gl, false)],
      null
    );
    this.combineScreenQuad = new ScreenQuad(
      this.gl,
      this.upscaleFramebuffer.textures
    );
  }

  setResolution(x: number, y: number) {
    this.width = x;
    this.height = y;
    this.upscaleFramebuffer.setProportions(
      x * this.renderScale,
      y * this.renderScale
    );
  }

  setRenderScale(renderScale) {
    if (renderScale != this.renderScale) {
      this.renderScale = renderScale;
      this.upscaleFramebuffer.setProportions(
        this.width * this.renderScale,
        this.height * this.renderScale
      );
    }
  }

  setFogTexture(texture: Texture) {
    this.volumetricScreenQuad.textures[1] = texture;
  }

  bindFramebuffers() {
    // Render result to screen or to framebuffer if doing effects after this.
    if (this.outputBuffer == undefined) {
      this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null); // Render directly to screen
    } else {
      this.outputBuffer.bind(this.gl.DRAW_FRAMEBUFFER);
    }
  }

  draw(scene: Scene, camera: Camera) {
    this.upscaleFramebuffer.bind(this.gl.DRAW_FRAMEBUFFER);
    this.gl.viewport(
      0,
      0,
      this.upscaleFramebuffer.getWidth(),
      this.upscaleFramebuffer.getHeight()
    );
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(
      this.gl.COLOR_BUFFER_BIT |
        this.gl.DEPTH_BUFFER_BIT |
        this.gl.STENCIL_BUFFER_BIT
    );
    this.volumetricLightingShaderProgram.use();
    this.gl.disable(this.gl.DEPTH_TEST);
    camera.bindViewProjMatrix(
      this.gl,
      this.volumetricLightingShaderProgram.getUniformLocation(
        "viewProjMatrix"
      )[0]
    );
    this.gl.uniform3fv(
      this.volumetricLightingShaderProgram.getUniformLocation("cameraPos")[0],
      camera.getPosition()
    );
    scene.directionalLight.bind(this.gl, this.volumetricLightingShaderProgram);
    scene.directionalLight.sendLightSpaceMatrix(
      this.gl,
      this.volumetricLightingShaderProgram.getUniformLocation(
        "lightSpaceMatrix"
      )[0]
    );

    this.gl.uniform1f(
      this.volumetricLightingShaderProgram.getUniformLocation(
        "fogMaxDistance"
      )[0],
      this.fogMaxDistance
    );
    this.gl.uniform1f(
      this.volumetricLightingShaderProgram.getUniformLocation("fogDensity")[0],
      this.fogDensity
    );

    // Point lights
    this.gl.uniform1i(
      this.volumetricLightingShaderProgram.getUniformLocation(
        "nrOfPointLights"
      )[0],
      Math.min(scene.pointLights.length, pointLightsToAllocate)
    );

    // Bind pointLights, with counter as depthMapIndex
    let counter = 0;
    for (
      let i = 0;
      i < scene.pointLights.length && i < pointLightsToAllocate;
      i++
    ) {
      scene.pointLights[i].bind(
        i,
        counter,
        this.volumetricLightingShaderProgram
      );
      if (scene.pointLights[i].castShadow) {
        counter++;
      }
    }

    // Then bind the point light depth maps
    counter = this.volumetricScreenQuad.textures.length;
    for (
      let i = 0;
      i < scene.pointLights.length && i < pointLightsToAllocate;
      i++
    ) {
      if (
        counter - this.volumetricScreenQuad.textures.length >=
        pointShadowsToAllocate
      ) {
        break;
      }
      if (scene.pointLights[i].castShadow) {
        scene.pointLights[i].pointShadowDepthMap.bind(counter++);
      }
    }

    // Time for fog moving
    this.gl.uniform1f(
      this.volumetricLightingShaderProgram.getUniformLocation("currentTime")[0],
      (Date.now() - applicationStartTime) * 0.001
    );

    this.volumetricScreenQuad.draw(this.volumetricLightingShaderProgram, true);

    this.bindFramebuffers();
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);

    this.gl.viewport(0, 0, this.width, this.height);

    // Here combine the texture in upscaleFramebuffer and pre-volumetric image
    if (this.blur) {
      this.volumetricCombineShaderProgram.use();
      this.combineScreenQuad.draw(this.volumetricCombineShaderProgram, true);
    } else {
      this.screenQuadShaderProgram.use(); // no blur
      this.combineScreenQuad.draw(this.screenQuadShaderProgram, true);
    }

    this.gl.disable(this.gl.BLEND);
    this.gl.enable(this.gl.DEPTH_TEST);
  }
}
