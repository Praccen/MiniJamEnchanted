const glslInputToGlType = {
  float: { type: WebGL2RenderingContext.FLOAT, size: 1 },
  vec2: { type: WebGL2RenderingContext.FLOAT, size: 2 },
  vec3: { type: WebGL2RenderingContext.FLOAT, size: 3 },
  vec4: { type: WebGL2RenderingContext.FLOAT, size: 4 },
  mat3: { type: WebGL2RenderingContext.FLOAT, size: 9 },
  mat4: { type: WebGL2RenderingContext.FLOAT, size: 16 },
};

const glslOutputToGlType = {
  float: WebGL2RenderingContext.RED,
  vec2: WebGL2RenderingContext.RG,
  vec3: WebGL2RenderingContext.RGB,
  vec4: WebGL2RenderingContext.RGBA,
};

export default class ShaderProgram {
  private uniformSamplerBindings: string[] = [];

  // Protected
  protected gl: WebGL2RenderingContext;
  protected shaderProgram: WebGLProgram | null = null;
  protected uniformBindings: Map<string, WebGLUniformLocation> = new Map<
    string,
    WebGLUniformLocation
  >();

  // Public
  inputs: { type: number; size: number }[] = []; // Type, size
  outputs: number[] = [];

  constructor(
    gl: WebGL2RenderingContext,
    shaderProgramName: string,
    vertexShaderSrc: string,
    fragmentShaderSrc: string,
    debugShaderCompilation: boolean = false,
  ) {
    this.gl = gl;
    this.loadShaders(
      shaderProgramName,
      vertexShaderSrc,
      fragmentShaderSrc,
      debugShaderCompilation,
    );
  }

  private setInterfaceFromShaderSource(
    vertexShaderString: string,
    fragmentShaderString: string,
  ) {
    this.use();

    this.inputs.length = 0;
    this.uniformBindings.clear();
    this.outputs.length = 0;
    this.uniformSamplerBindings.length = 0;

    let samplerNumber = 0;

    let self = this;
    let structsDeclared = new Map<string, { type: string; name: string }[]>();

    let parsingIn = false;
    let parsingUniform = false;
    let parsingOut = false;
    let parsingStruct = false;
    let buffer = "";
    let currentStruct: { type: string; name: string }[] | undefined = undefined;

    function resetBuffer() {
      parsingIn = false;
      parsingUniform = false;
      parsingOut = false;
      parsingStruct = false;
      currentStruct = undefined;
      buffer = "";
    }

    function setUniform(buffer: string) {
      buffer = buffer.replace(";", "");
      const words = buffer.split(/\s+/).filter((value) => value.length > 0);
      const type = words[0];
      words.splice(0, 1);
      const name = words.join("");
      if (name.endsWith("]")) {
        // This is an array
        // Find opening bracket and number
        let openingBracketIndex = name.indexOf("[");
        let uniformArraySize = parseInt(
          name.substring(openingBracketIndex + 1, name.length - 1),
        );
        for (let i = 0; i < uniformArraySize; i++) {
          const uniformArrayElementName =
            name.substring(0, openingBracketIndex) + "[" + i + "]";
          if (structsDeclared.has(type)) {
            for (const structMember of structsDeclared.get(type)!) {
              self.setUniformLocation(
                uniformArrayElementName + "." + structMember.name,
              );
              if (structMember.type.startsWith("sampler")) {
                self.gl.uniform1i(
                  self.getUniformLocation(
                    uniformArrayElementName + "." + structMember.name,
                  )[0],
                  samplerNumber++,
                );
                self.uniformSamplerBindings.push(
                  uniformArrayElementName + "." + structMember.name,
                );
              }
            }
          } else {
            self.setUniformLocation(uniformArrayElementName);
            if (type.startsWith("sampler")) {
              self.gl.uniform1i(
                self.getUniformLocation(uniformArrayElementName)[0],
                samplerNumber++,
              );
              self.uniformSamplerBindings.push(uniformArrayElementName);
            }
          }
        }
      } else {
        // Not an array, use the name directly
        if (structsDeclared.has(type)) {
          for (const structMember of structsDeclared.get(type)!) {
            self.setUniformLocation(name + "." + structMember.name);
            if (structMember.type.startsWith("sampler")) {
              self.gl.uniform1i(
                self.getUniformLocation(name + "." + structMember.name)[0],
                samplerNumber++,
              );
              self.uniformSamplerBindings.push(name + "." + structMember.name);
            }
          }
        } else if (type.startsWith("sampler")) {
          self.uniformSamplerBindings.push(name);
          self.setUniformLocation(name);
          self.gl.uniform1i(self.getUniformLocation(name)[0], samplerNumber++);
        } else {
          self.setUniformLocation(name);
        }
      }
    }

    function parseShaderSrc(
      src: string,
      parseInputs: boolean,
      parseOutputs: boolean,
    ) {
      for (const word of src.split(/\s+/).filter((value) => value.length > 0)) {
        if (parseInputs && word == "in") {
          resetBuffer();
          parsingIn = true;
          continue;
        }

        if (parseOutputs && word == "out") {
          resetBuffer();
          parsingOut = true;
          continue;
        }

        if (word == "struct") {
          resetBuffer();
          parsingStruct = true;
          continue;
        }

        if (word == "uniform") {
          resetBuffer();
          parsingUniform = true;
          continue;
        }

        if (parsingIn) {
          buffer += word + " ";
          if (word.includes(";")) {
            self.inputs.push(
              glslInputToGlType[buffer.substring(0, buffer.indexOf(" "))],
            );
            resetBuffer();
          }
        }

        if (parsingStruct) {
          if (currentStruct == undefined) {
            structsDeclared.set(word, []);
            currentStruct = structsDeclared.get(word);
            continue;
          }

          if (word.includes("}")) {
            buffer += word.replace("}", "");
            buffer = buffer.replace("{", "");

            for (const member of buffer.split(";")) {
              const parts = member
                .split(/\s+/)
                .filter((value) => value.length > 0);
              if (parts.length >= 2) {
                currentStruct?.push({ type: parts[0], name: parts[1] });
              }
            }
            resetBuffer();
            continue;
          }
          buffer += word + " ";
        }

        if (parsingUniform) {
          buffer += word + " ";
          if (word.includes(";")) {
            setUniform(buffer);
            resetBuffer();
          }
        }
      }
    }

    parseShaderSrc(vertexShaderString, true, false);

    structsDeclared.clear();
    resetBuffer();

    parseShaderSrc(fragmentShaderString, false, true);
  }

  loadShaders(
    shaderProgramName: string,
    vertexShaderString: string,
    fragmentShaderString: string,
    debugShaderCompilation: boolean,
  ) {
    // link shaders
    if (this.shaderProgram != null) {
      this.gl.deleteProgram(this.shaderProgram); // Delete in case this is not the first time this shader is created.
    }

    console.log("Compiling shader program: " + shaderProgramName);

    // vertex shader
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (vertexShader == undefined) {
      console.log(
        "Vertex shader could not be created (" + shaderProgramName + ")",
      );
      return;
    }
    this.gl.shaderSource(vertexShader, vertexShaderString);
    this.gl.compileShader(vertexShader);

    // Check for shader compile errors
    if (
      !this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS) ||
      debugShaderCompilation
    ) {
      console.log(
        "Vertex shader compiled successfully: " +
          this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS),
      );
      console.log(
        "Vertex shader compiler log: \n" +
          this.gl.getShaderInfoLog(vertexShader),
      );
    }

    // fragment shader
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (fragmentShader == undefined) {
      console.log(
        "Fragment shader could not be created (" + shaderProgramName + ")",
      );
      return;
    }
    this.gl.shaderSource(fragmentShader, fragmentShaderString);
    this.gl.compileShader(fragmentShader);

    // Check for shader compile errors
    if (
      !this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS) ||
      debugShaderCompilation
    ) {
      console.log(
        "Fragment shader compiled successfully: " +
          this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS),
      );
      console.log(
        "Fragment shader compiler log: \n" +
          this.gl.getShaderInfoLog(fragmentShader),
      );
    }

    this.shaderProgram = this.gl.createProgram();

    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    // Check for linking errors?
    let linkedShaders = this.gl.getProgramParameter(
      this.shaderProgram,
      this.gl.LINK_STATUS,
    );
    if (!linkedShaders || debugShaderCompilation) {
      console.log("Linked shaders successfully: " + linkedShaders);
      console.log(
        "Linking shaders log: \n" +
          this.gl.getProgramInfoLog(this.shaderProgram),
      );
    }

    // Delete shaders now that they have been made into a program
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    this.setInterfaceFromShaderSource(vertexShaderString, fragmentShaderString);
  }

  use() {
    this.gl.useProgram(this.shaderProgram);
  }

  private setUniformLocation(uniformName: string) {
    if (this.shaderProgram == undefined) {
      return;
    }
    const uniformLoc = this.gl.getUniformLocation(
      this.shaderProgram,
      uniformName,
    );
    if (uniformLoc == undefined) {
      return;
    }
    this.uniformBindings.set(uniformName, uniformLoc);
  }

  getUniformLocation(uniformName: string): [WebGLUniformLocation, boolean] {
    if (this.uniformBindings.has(uniformName)) {
      return [this.uniformBindings.get(uniformName)!, true];
    }

    // console.log("No uniform with name " + uniformName + "\n");
    return [0, false];
  }

  getTextureIndexFromSamplerUniformName(uniformName: string): number {
    let exactIndex = this.uniformSamplerBindings.indexOf(uniformName);
    if (exactIndex >= 0) {
      return exactIndex;
    }

    let memberNameMatches = this.uniformSamplerBindings.findIndex((value) =>
      value.includes("." + uniformName),
    );

    return memberNameMatches; // Possibly -1, texture.bind will check.
  }
}
