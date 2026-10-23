import Framebuffer from "../../Framebuffers/Framebuffer.js";
import Texture from "../../../AssetHandling/Textures/Texture.js";
import Scene from "../../Scene.js";
import DirectionalShadowShaderProgram from "../../ShaderPrograms/ShadowMapping/DirectionalShadowShaderProgram.js";
import DirectionalShadowInstancedShaderProgram from "../../ShaderPrograms/ShadowMapping/DirectionalShadowInstancedShaderProgram.js";
import DirectionalShadowSkeletalAnimationShaderProgram from "../../ShaderPrograms/ShadowMapping/DirectionalShadowSkeletalAnimationShaderProgram.js";

export default class DirectionalShadowRenderPass {
  private gl: WebGL2RenderingContext;

  // ---- Shadow mapping ----
  private shadowResolution: number;
  shadowBuffer: Framebuffer;

  private directionalShadowShaderProgram: DirectionalShadowShaderProgram;
  private directionalShadowInstancedShaderProgram: DirectionalShadowInstancedShaderProgram;
  private directionalShadowSkeletalAnimationShaderProgram: DirectionalShadowSkeletalAnimationShaderProgram;
  // ------------------------

  private frameCounter: number;

  constructor(
    gl: WebGL2RenderingContext,
    directionalShadowShaderProgram: DirectionalShadowShaderProgram,
    directionalShadowInstancedShaderProgram: DirectionalShadowInstancedShaderProgram,
    directionalShadowSkeletalAnimationShaderProgram: DirectionalShadowSkeletalAnimationShaderProgram
  ) {
    this.gl = gl;
    this.directionalShadowShaderProgram = directionalShadowShaderProgram;
    this.directionalShadowInstancedShaderProgram =
      directionalShadowInstancedShaderProgram;
    this.directionalShadowSkeletalAnimationShaderProgram =
      directionalShadowSkeletalAnimationShaderProgram;
    // ---- Shadow mapping ----
    this.shadowResolution = 1600;
    this.shadowBuffer = new Framebuffer(
      this.gl,
      this.shadowResolution,
      this.shadowResolution,
      [],
      new Texture(
        this.gl,
        false,
        this.gl.DEPTH_COMPONENT32F,
        this.gl.DEPTH_COMPONENT,
        this.gl.FLOAT
      )
    );
    // ------------------------

    this.shadowBuffer.depthTexture.setTexParameterI(
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    );
    this.shadowBuffer.depthTexture.setTexParameterI(
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    );
    this.frameCounter = 0;
  }

  setShadowMappingResolution(res: number) {
    this.shadowResolution = res;
    this.shadowBuffer.setProportions(res, res);
  }

  draw(scene: Scene) {
    if (this.frameCounter++ % 5 != 0) {
      return;
    }

    this.shadowBuffer.bind(this.gl.FRAMEBUFFER);

    this.gl.enable(this.gl.DEPTH_TEST);

    // ---- Shadow pass ----
    this.directionalShadowShaderProgram.use();
    this.gl.viewport(
      1,
      1,
      this.shadowResolution - 2,
      this.shadowResolution - 2
    ); // Leave one pixel at the border so that clamp to edge is consistent
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.FRONT);

    //Set uniforms
    scene.directionalLight.calcAndSendLightSpaceMatrix(
      this.gl,
      this.directionalShadowShaderProgram.getUniformLocation(
        "lightSpaceMatrix"
      )[0]
    );

    //Render shadow pass
    scene.renderScene(this.directionalShadowShaderProgram);

    // Same stuff but instanced
    this.directionalShadowInstancedShaderProgram.use();
    scene.directionalLight.sendLightSpaceMatrix(
      this.gl,
      this.directionalShadowInstancedShaderProgram.getUniformLocation(
        "lightSpaceMatrix"
      )[0]
    );
    scene.renderSceneInstanced(this.directionalShadowInstancedShaderProgram);

    // Same stuff but animated
    this.directionalShadowSkeletalAnimationShaderProgram.use();
    scene.directionalLight.sendLightSpaceMatrix(
      this.gl,
      this.directionalShadowSkeletalAnimationShaderProgram.getUniformLocation(
        "lightSpaceMatrix"
      )[0]
    );
    scene.renderSceneAnimated(
      this.directionalShadowSkeletalAnimationShaderProgram
    );

    this.gl.disable(this.gl.CULL_FACE);
    // ---------------------
  }
}
