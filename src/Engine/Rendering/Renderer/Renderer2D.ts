import Camera from "../Objects/Camera.js";
import Scene from "./Scene.js";
import ScreenQuadShaderProgram from "./ShaderPrograms/ScreenQuadShaderProgram.js";
import RendererBase from "./RendererBase.js";
import GUIShaderProgram from "./ShaderPrograms/GUI/GUIShaderProgram.js";

export default class Renderer2D extends RendererBase {
  // ---- Multi use ----
  screenQuadShaderProgram: ScreenQuadShaderProgram;
  // -------------------

  guiShaderProgram: GUIShaderProgram;

  constructor() {
    super();

    this.guiShaderProgram = new GUIShaderProgram(this.gl);
  }

  render(
    scene: Scene,
    camera: Camera,
    saveScreenshot: boolean = false,
    screenshotName: string = "screencapture",
  ) {
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.cullFace(this.gl.FRONT);
    this.gl.enable(this.gl.CULL_FACE);

    scene.calculateAllTransforms();

    this.gl.viewport(0, 0, this.width, this.height);

    // Clear the output with the actual clear colour we have set
    this.gl.clearColor(
      this.clearColour.r,
      this.clearColour.g,
      this.clearColour.b,
      this.clearColour.a,
    );
    this.gl.clear(
      this.gl.COLOR_BUFFER_BIT |
        this.gl.DEPTH_BUFFER_BIT |
        this.gl.STENCIL_BUFFER_BIT,
    );

    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null);
    this.guiShaderProgram.use();

    camera.bindViewProjMatrix(
      this.gl,
      this.guiShaderProgram.getUniformLocation("viewProjMatrix")[0],
    );
    scene.renderSceneInLayerOrder(this.guiShaderProgram);

    if (saveScreenshot) {
      this.takeScreenshot(screenshotName);
    }
  }
}
