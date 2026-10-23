import Camera from "../../../Objects/Camera.js";
import Framebuffer from "../../Framebuffers/Framebuffer.js";
import Texture from "../../../AssetHandling/Textures/Texture.js";
import Scene from "../../Scene.js";
import GeometryPassShaderProgram from "../../ShaderPrograms/DeferredRendering/GeometryPassShaderProgram.js";
import GeometryPassInstancedShaderProgram from "../../ShaderPrograms/DeferredRendering/GeometryPassInstancedShaderProgram.js";
import GeometryPassSkeletalAnimationShaderProgram from "../../ShaderPrograms/DeferredRendering/GeometryPassSkeletalAnimationShaderProgram.js";
import Shape from "../../../../Physics/Physics/Shapes/Shape.js";

export default class GeometryRenderPass {
  private gl: WebGL2RenderingContext;
  private geometryPassShaderProgram: GeometryPassShaderProgram;
  private geometryPassInstancedShaderProgram: GeometryPassInstancedShaderProgram;
  private geometryPassSkeletalAnimationShaderProgram: GeometryPassSkeletalAnimationShaderProgram;
  outputFramebuffer: Framebuffer;

  constructor(
    gl: WebGL2RenderingContext,
    geometryPassShaderProgram: GeometryPassShaderProgram,
    geometryPassInstancedShaderProgram: GeometryPassInstancedShaderProgram,
    geometryPassSkeletalAnimationShaderProgram: GeometryPassSkeletalAnimationShaderProgram
  ) {
    this.gl = gl;
    this.geometryPassShaderProgram = geometryPassShaderProgram;
    this.geometryPassInstancedShaderProgram =
      geometryPassInstancedShaderProgram;
    this.geometryPassSkeletalAnimationShaderProgram =
      geometryPassSkeletalAnimationShaderProgram;
    this.outputFramebuffer = new Framebuffer(
      this.gl,
      100,
      100,
      [
        new Texture(
          this.gl,
          false,
          this.gl.RGBA32F,
          this.gl.RGBA,
          this.gl.FLOAT
        ),
        new Texture(
          this.gl,
          false,
          this.gl.RGBA32F,
          this.gl.RGBA,
          this.gl.FLOAT
        ),
        new Texture(this.gl, false),
        new Texture(this.gl, false),
      ],
      null
    );
  }

  setResolution(x: number, y: number) {
    this.outputFramebuffer.setProportions(x, y);
  }

  draw(scene: Scene, camera: Camera, cameraFrustum: Shape) {
    this.geometryPassShaderProgram.use();
    this.gl.viewport(
      0.0,
      0.0,
      this.outputFramebuffer.getWidth(),
      this.outputFramebuffer.getHeight()
    );

    // Bind gbuffer and clear that with 0,0,0,0 (the alpha = 0 is important to be able to identify fragments in the lighting pass that have not been written with geometry)
    this.outputFramebuffer.bind(this.gl.FRAMEBUFFER);
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(
      this.gl.COLOR_BUFFER_BIT |
        this.gl.DEPTH_BUFFER_BIT |
        this.gl.STENCIL_BUFFER_BIT
    );

    this.gl.disable(this.gl.BLEND);

    camera.bindViewProjMatrix(
      this.gl,
      this.geometryPassShaderProgram.getUniformLocation("viewProjMatrix")[0]
    );

    scene.renderScene(this.geometryPassShaderProgram);

    this.geometryPassInstancedShaderProgram.use();
    camera.bindViewProjMatrix(
      this.gl,
      this.geometryPassInstancedShaderProgram.getUniformLocation(
        "viewProjMatrix"
      )[0]
    );

    scene.renderSceneInstanced(this.geometryPassInstancedShaderProgram);

    this.geometryPassSkeletalAnimationShaderProgram.use();
    camera.bindViewProjMatrix(
      this.gl,
      this.geometryPassSkeletalAnimationShaderProgram.getUniformLocation(
        "viewProjMatrix"
      )[0]
    );

    scene.renderSceneAnimated(this.geometryPassSkeletalAnimationShaderProgram);
  }
}
