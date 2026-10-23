import MeshStore from "../AssetHandling/MeshStore.js";
import TextureStore from "../AssetHandling/TextureStore.js";

export const pointLightsToAllocate: number = 10;
export let pointShadowsToAllocate: number = 4;

export default class RendererBase {
  // public
  clearColour: { r: number; g: number; b: number; a: number };

  domElement: HTMLCanvasElement;

  textureStore: TextureStore;
  meshStore: MeshStore;

  protected width: number;
  protected height: number;

  gl: WebGL2RenderingContext;

  constructor() {
    this.initGL();
    this.width = 100;
    this.height = 100;

    this.textureStore = new TextureStore(this);
    this.meshStore = new MeshStore(this, this.textureStore);
  }

  initGL() {
    this.domElement = <HTMLCanvasElement>document.createElement("canvas");

    this.gl = this.domElement.getContext("webgl2", { antialias: false });
    if (!this.gl.getExtension("EXT_color_buffer_float")) {
      alert(
        "Rendering to floating point textures is not supported on this platform"
      );
    }
    if (!this.gl.getExtension("OES_texture_float_linear")) {
      alert("Floating point rendering to FBO textures not supported");
    }

    if (!this.gl) {
      console.log("Failed to get rendering context for WebGL");
      return;
    }

    this.clearColour = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
    this.gl.clearColor(
      this.clearColour.r,
      this.clearColour.g,
      this.clearColour.b,
      this.clearColour.a
    );

    pointShadowsToAllocate = Math.min(
      pointShadowsToAllocate,
      this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS) - 5
    );

    // Enable depth test
    this.gl.enable(this.gl.DEPTH_TEST);

    // Disable alpha blending since we are using screen door transparancy
    this.gl.disable(this.gl.BLEND);

    // Enable back face culling
    this.gl.cullFace(this.gl.BACK);
    this.gl.enable(this.gl.CULL_FACE);
  }

  setSize(x: number, y: number, updateStyle: boolean = false) {
    this.width = x;
    this.height = y;

    if (updateStyle) {
      this.domElement.width = this.width;
      this.domElement.height = this.height;
    }
  }

  protected takeScreenshot(screenshotName: string) {
    var offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = this.gl.canvas.width;
    offscreenCanvas.height = this.gl.canvas.height;
    var ctx = offscreenCanvas.getContext("2d");

    ctx.drawImage(this.gl.canvas, 0, 0);

    const saveBlob = (function () {
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style.display = "none";
      return function saveData(blob, fileName) {
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
      };
    })();

    offscreenCanvas.toBlob((blob) => {
      saveBlob(blob, screenshotName);
    });
  }
}
