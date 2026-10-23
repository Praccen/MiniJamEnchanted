import Skybox from "../../Objects/GraphicsObjects/Skybox.js";
import CubeMap from "../../AssetHandling/Textures/CubeMap.js";
import Camera from "../../Objects/Camera.js";
import SkyboxShaderProgram from "../ShaderPrograms/Skybox/SkyboxShaderProgram.js";

export default class SkyboxRenderPass {
  private gl: WebGL2RenderingContext;
  private skyboxShaderProgram: SkyboxShaderProgram;
  private skybox: Skybox;

  constructor(
    gl: WebGL2RenderingContext,
    skyboxShaderProgram: SkyboxShaderProgram
  ) {
    this.gl = gl;
    this.skyboxShaderProgram = skyboxShaderProgram;
    this.skybox = null;
  }

  setSkybox(cubemap: CubeMap) {
    this.skybox = new Skybox(this.gl, cubemap);
  }

  draw(camera: Camera) {
    if (this.skybox != undefined) {
      this.gl.enable(this.gl.DEPTH_TEST);
      this.skyboxShaderProgram.use();
      const viewProjMatrixUL =
        this.skyboxShaderProgram.getUniformLocation("viewProjMatrix");
      if (viewProjMatrixUL[1]) {
        camera.bindViewProjMatrix(this.gl, viewProjMatrixUL[0], true);
      }
      this.gl.depthFunc(this.gl.LEQUAL);
      this.skybox.draw(this.skyboxShaderProgram);
      this.gl.depthFunc(this.gl.LESS);
    }
  }
}
