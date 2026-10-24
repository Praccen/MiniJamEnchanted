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

  // Internal (possibly supersampled) resolution. All full screen framebuffers
  // and viewports before the final blit use these.
  protected width: number;
  protected height: number;

  // Display resolution, in CSS pixels. The canvas is laid out at this size and
  // the final blit targets it.
  protected displayWidth: number;
  protected displayHeight: number;

  protected ssaaFactor: number;

  gl: WebGL2RenderingContext;

  constructor() {
    this.initGL();
    this.ssaaFactor = 1.0;
    this.displayWidth = 100;
    this.displayHeight = 100;
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
        "Rendering to floating point textures is not supported on this platform",
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
      this.clearColour.a,
    );

    pointShadowsToAllocate = Math.min(
      pointShadowsToAllocate,
      this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS) - 5,
    );

    // Enable depth test
    this.gl.enable(this.gl.DEPTH_TEST);

    // Disable alpha blending since we are using screen door transparancy
    this.gl.disable(this.gl.BLEND);

    // Enable back face culling
    this.gl.cullFace(this.gl.BACK);
    this.gl.enable(this.gl.CULL_FACE);
  }

  /**
   * Set the display size, in CSS pixels. The internal rendering resolution is
   * this multiplied by the current SSAA factor.
   */
  setSize(x: number, y: number, updateStyle: boolean = false) {
    this.displayWidth = x;
    this.displayHeight = y;

    this.width = Math.max(1, Math.round(x * this.ssaaFactor));
    this.height = Math.max(1, Math.round(y * this.ssaaFactor));

    if (updateStyle) {
      // The canvas stays at the display resolution. Supersampling happens in
      // the offscreen framebuffers, and the final pass resolves them down into
      // this buffer, so the browser never has to rescale the canvas itself.
      this.domElement.width = this.displayWidth;
      this.domElement.height = this.displayHeight;
      this.domElement.style.width = this.displayWidth + "px";
      this.domElement.style.height = this.displayHeight + "px";
    }
  }

  /**
   * Supersampling factor. 2.0 renders at twice the width and height (four
   * times the fragments) and downsamples on output. Reallocates every full
   * screen framebuffer, so don't call this per frame.
   */
  setSSAAFactor(factor: number) {
    this.ssaaFactor = Math.min(Math.max(factor, 0.5), 4.0);
    this.setSize(this.displayWidth, this.displayHeight, true);
  }

  getSSAAFactor(): number {
    return this.ssaaFactor;
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
