import Texture from "../../AssetHandling/Textures/Texture.js";

export default class Framebuffer {
  // Public
  textures: Array<Texture>;
  depthTexture: Texture;

  // Protected
  protected rbo: WebGLRenderbuffer;
  protected fbo: WebGLFramebuffer;
  protected width: number;
  protected height: number;
  protected gl: WebGL2RenderingContext;

  /**
   * @param width - width of framebuffer textures
   * @param height - height of framebuffer textures
   * @param textures - colour attachment textures, send empty array if no colour attachments should be used
   * @param depthTexture - depth attachment texture, send null if no depth attachment (an rbo will be created instead)
   */
  constructor(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    textures: Array<Texture>,
    depthTexture: Texture,
  ) {
    this.gl = gl;
    this.width = width;
    this.height = height;

    this.textures = textures;
    this.depthTexture = depthTexture;

    this.fbo = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);

    this.setupAttachments();

    if (
      this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !=
      this.gl.FRAMEBUFFER_COMPLETE
    ) {
      console.warn("ERROR::FRAMEBUFFER:: Framebuffer is not complete!");
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  protected setupAttachments() {
    let attachments = new Array<number>();
    for (let i = 0; i < this.textures.length; i++) {
      this.textures[i].setTextureData(null, this.width, this.height);
      if (this.textures[i].textureTarget == this.gl.TEXTURE_CUBE_MAP) {
        // This is a cube map, set the positive x as target and rendering loop will take care of switching target to the correct side
        this.gl.framebufferTexture2D(
          this.gl.FRAMEBUFFER,
          this.gl.COLOR_ATTACHMENT0 + i,
          this.gl.TEXTURE_CUBE_MAP_POSITIVE_X,
          this.textures[i].texture,
          0,
        );
        attachments.push(this.gl.COLOR_ATTACHMENT0 + i);
      } else {
        // This is a normal 2D texture, set TexParameters to something fitting for a framebuffer target, and set up the target.
        this.textures[i].setTexParameterI(
          this.gl.TEXTURE_MIN_FILTER,
          this.gl.LINEAR,
        );
        this.textures[i].setTexParameterI(
          this.gl.TEXTURE_MAG_FILTER,
          this.gl.LINEAR,
        );
        this.textures[i].setTexParameterI(
          this.gl.TEXTURE_WRAP_S,
          this.gl.CLAMP_TO_EDGE,
        );
        this.textures[i].setTexParameterI(
          this.gl.TEXTURE_WRAP_T,
          this.gl.CLAMP_TO_EDGE,
        );
        this.gl.framebufferTexture2D(
          this.gl.FRAMEBUFFER,
          this.gl.COLOR_ATTACHMENT0 + i,
          this.gl.TEXTURE_2D,
          this.textures[i].texture,
          0,
        );
        attachments.push(this.gl.COLOR_ATTACHMENT0 + i);
      }
    }

    // Attach drawing targets
    this.gl.drawBuffers(attachments);

    if (this.depthTexture != undefined) {
      // There is a defined depth texture, null it's content with the correct width and height
      this.depthTexture.setTextureData(null, this.width, this.height);

      if (this.depthTexture.textureTarget == this.gl.TEXTURE_CUBE_MAP) {
        // The depth texture is a cube map, set the positive x as target and rendering loop will take care of switching target to the correct side
        this.gl.framebufferTexture2D(
          this.gl.FRAMEBUFFER,
          this.gl.DEPTH_ATTACHMENT,
          this.gl.TEXTURE_CUBE_MAP_POSITIVE_X,
          this.depthTexture.texture,
          0,
        );
      } else {
        // The depth texture is a normal 2D texture, set up the appropriate target
        this.gl.framebufferTexture2D(
          this.gl.FRAMEBUFFER,
          this.gl.DEPTH_ATTACHMENT,
          this.gl.TEXTURE_2D,
          this.depthTexture.texture,
          0,
        );
      }
    } else {
      // We have no defined depth texture, use a render buffer instead
      this.rbo = this.gl.createRenderbuffer();
      this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.rbo);
      this.gl.renderbufferStorage(
        this.gl.RENDERBUFFER,
        this.gl.DEPTH_STENCIL,
        this.width,
        this.height,
      );

      this.gl.framebufferRenderbuffer(
        this.gl.FRAMEBUFFER,
        this.gl.DEPTH_STENCIL_ATTACHMENT,
        this.gl.RENDERBUFFER,
        this.rbo,
      );
    }
  }

  /**
   * Will setup the framebuffer to the given width and height, including resizing (and clearing) all textures (both normal render textures and depth texture)
   * For cubemaps all sides will be cleared and resized
   * @param width New width of the framebuffer
   * @param height New height of the framebuffer
   */
  setProportions(width: number, height: number) {
    // Callers can derive sizes by scaling (SSAA factor, volumetric render
    // scale), so guard against fractional dimensions reaching texImage2D.
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    for (let texture of this.textures) {
      texture.setTextureData(null, this.width, this.height);
    }
    if (this.depthTexture) {
      this.depthTexture.setTextureData(null, this.width, this.height);
    }

    if (this.rbo) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
      this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.rbo);
      this.gl.renderbufferStorage(
        this.gl.RENDERBUFFER,
        this.gl.DEPTH24_STENCIL8,
        this.width,
        this.height,
      );
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  /**
   * Bind this framebuffer to the sent in target
   * @param target framebuffer target (for example this.gl.FRAMEBUFFER, this.gl.DRAW_FRAMEBUFFER, this.gl.READ_FRAMEBUFFER)
   */
  bind(target: number) {
    this.gl.bindFramebuffer(target, this.fbo);
  }
}
