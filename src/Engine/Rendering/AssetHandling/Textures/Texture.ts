export default class Texture {
  // Public
  width: number;
  height: number;
  texture: WebGLTexture;

  loadedFromFile: boolean;

  protected gl: WebGL2RenderingContext;
  protected useMipMap: boolean;

  protected internalFormat: number;
  protected format: number;
  protected dataStorageType: number;
  textureTarget: number;

  constructor(
    gl: WebGL2RenderingContext,
    useMipMap: boolean = true,
    internalFormat: number = gl.RGBA,
    format: number = gl.RGBA,
    dataStorageType: number = gl.UNSIGNED_BYTE,
    textureTarget: number = gl.TEXTURE_2D,
  ) {
    this.gl = gl;
    this.useMipMap = useMipMap;

    this.internalFormat = internalFormat;
    this.format = format;
    this.dataStorageType = dataStorageType;
    this.textureTarget = textureTarget;

    // Generate texture
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.textureTarget, this.texture);

    // Set texture parameters
    this.gl.texParameteri(
      this.textureTarget,
      this.gl.TEXTURE_WRAP_S,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.textureTarget,
      this.gl.TEXTURE_WRAP_T,
      this.gl.REPEAT,
    );
    this.gl.texParameteri(
      this.textureTarget,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST,
    );
    this.gl.texParameteri(
      this.textureTarget,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST,
    );
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

    // Make a 1 by 1 texture
    this.setTextureData(null, 1, 1);

    this.gl.bindTexture(this.textureTarget, null);
  }

  setTextureData(
    data: Uint8Array | Float32Array,
    width: number,
    height: number,
  ) {
    this.width = width;
    this.height = height;
    this.gl.bindTexture(this.textureTarget, this.texture);
    this.gl.texImage2D(
      this.textureTarget,
      0,
      this.internalFormat,
      width,
      height,
      0,
      this.format,
      this.dataStorageType,
      data,
    );
    if (this.useMipMap) {
      this.gl.generateMipmap(this.textureTarget);
      this.gl.texParameteri(
        this.textureTarget,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR_MIPMAP_LINEAR,
      );
    }
    this.gl.bindTexture(this.textureTarget, null);

    this.loadedFromFile = false;
  }

  bind(textureIndex: number = 0) {
    if (textureIndex < 0) {
      return;
    }
    this.gl.activeTexture(this.gl.TEXTURE0 + textureIndex);
    this.gl.bindTexture(this.textureTarget, this.texture);
  }

  loadFromFileContent(mimeType: string, content: ArrayBuffer) {
    try {
      let uintArray = new Uint8Array(content);
      let contentString = "";
      for (let character of uintArray) {
        contentString += String.fromCharCode(character);
      }
      let base64 = btoa(contentString);
      this.loadFromFile("data:" + mimeType + ";base64," + base64);
    } catch (e: any) {
      console.warn(e.message);
    }
  }

  loadFromFile(URL: string) {
    let image = new Image();
    image.crossOrigin = "";
    image.src = URL;
    let self = this;
    image.addEventListener("load", function () {
      // Now that the image has loaded copy it to the texture and save the width/height.
      self.width = image.width;
      self.height = image.height;
      self.gl.bindTexture(self.textureTarget, self.texture);
      self.gl.texImage2D(
        self.textureTarget,
        0,
        self.internalFormat,
        self.format,
        self.dataStorageType,
        image,
      );
      if (self.useMipMap) {
        self.gl.generateMipmap(self.textureTarget);
        self.gl.texParameteri(
          self.textureTarget,
          self.gl.TEXTURE_MIN_FILTER,
          self.gl.LINEAR_MIPMAP_LINEAR,
        );
      }
      self.loadedFromFile = true;
    });
  }

  createFromCSSColorValue(colorValue: string) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 255;
    if (colorValue.startsWith("#")) {
      // Hex
      if (colorValue.length >= 7) {
        r = parseInt(colorValue.slice(1, 3), 16);
        g = parseInt(colorValue.slice(3, 5), 16);
        b = parseInt(colorValue.slice(5, 7), 16);
        if (colorValue.length == 9) {
          a = parseInt(colorValue.slice(7, 9), 16);
        }
      }
    } else if (colorValue.startsWith("rgba(")) {
      let rfindResult = colorValue.lastIndexOf(")");
      let values = colorValue
        .substring("rgba(".length, rfindResult)
        .split(",")
        .map((value) => {
          return parseFloat(value);
        });
      r = values[0];
      g = values[1];
      b = values[2];
      a = values[3] * 255;
    } else if (colorValue.startsWith("rgb(")) {
      let rfindResult = colorValue.lastIndexOf(")");
      let values = colorValue
        .substring("rgb(".length, rfindResult)
        .split(",")
        .map((value) => {
          if (value.includes(".")) {
            return parseFloat(value) * 255;
          }
          return parseInt(value);
        });
      r = values[0];
      g = values[1];
      b = values[2];
    }

    this.setTextureData(new Uint8Array([r, g, b, a]), 1, 1);
  }

  setTexParameterI(a: number, b: number) {
    this.gl.bindTexture(this.textureTarget, this.texture);
    this.gl.texParameteri(this.textureTarget, a, b);
    this.gl.bindTexture(this.textureTarget, null);
  }
}
