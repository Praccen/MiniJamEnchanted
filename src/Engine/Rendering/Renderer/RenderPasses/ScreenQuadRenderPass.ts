import Framebuffer from "../Framebuffers/Framebuffer.js";
import Texture from "../../AssetHandling/Textures/Texture.js";
import ScreenQuad from "../../Objects/GraphicsObjects/ScreenQuad.js";
import ScreenQuadShaderProgram from "../ShaderPrograms/ScreenQuadShaderProgram.js";

export default class ScreenQuadPass {
  private gl: WebGL2RenderingContext;
  private screenQuad: ScreenQuad;
  private screenQuadShaderProgram: ScreenQuadShaderProgram;
  outputFramebuffer: Framebuffer;

  constructor(
    gl: WebGL2RenderingContext,
    screenQuadShaderProgram: ScreenQuadShaderProgram,
    inputTextures: Texture[],
  ) {
    this.gl = gl;
    this.screenQuad = new ScreenQuad(gl, inputTextures);
    this.screenQuadShaderProgram = screenQuadShaderProgram;
    this.outputFramebuffer = null;
  }

  private bindOutput() {
    if (this.outputFramebuffer == undefined) {
      this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null); // Render directly to screen
    } else {
      this.outputFramebuffer.bind(this.gl.DRAW_FRAMEBUFFER);
    }
  }

  draw() {
    this.bindOutput();
    this.gl.disable(this.gl.DEPTH_TEST);

    this.screenQuadShaderProgram.use();
    this.screenQuad.draw(this.screenQuadShaderProgram, true);

    this.gl.enable(this.gl.DEPTH_TEST);
  }
}
