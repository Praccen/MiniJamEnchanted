import { mat4, vec3 } from "gl-matrix";
import Texture from "../../AssetHandling/Textures/Texture.js";
import GraphicsObject from "../GraphicsObjects/GraphicsObject.js";
import Transform from "../../../Shared/Transform.js";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";

export default class GraphicsBundle {
  gl: WebGL2RenderingContext;
  transform: Transform;
  textureMatrix: mat4;

  diffuse: Texture;
  specular: Texture;
  emission: Texture;

  emissionColor: vec3;

  graphicsObject: GraphicsObject;
  enabled: boolean;
  layer: number; // A number corresponding to which layer this will be drawn when using Scene.renderSceneInLayerOrder, should be >= 0 and a higher number means being drawn later

  private instanced: boolean;
  instancedTransforms: Array<Transform>;
  private transformsActive: number = 0;
  private instanceVBO: WebGLBuffer;

  protected minPositions: vec3 = vec3.create();
  protected maxPositions: vec3 = vec3.create();

  // This can be filled with custom uniforms that will be attempted to be applied when draw is called. The key is the name of the uniform, and the value is an object with the function to call to set the uniform, along with the arguments for that function.
  customUniformsMap = new Map<
    string,
    { setUniformFunction: Function; args: any[]; defaultArgs: any[] }
  >();

  constructor(
    gl: WebGL2RenderingContext,
    diffuse: Texture,
    specular: Texture,
    graphicsObject: GraphicsObject,
    emissionMap?: Texture,
    instanced: boolean = false
  ) {
    this.gl = gl;
    this.diffuse = diffuse;
    this.specular = specular;

    if (emissionMap != undefined) {
      this.emission = emissionMap;
    } else {
      this.emission = new Texture(this.gl);
      this.emission.setTextureData(new Uint8Array([0.0, 0.0, 0.0, 0.0]), 1, 1);
    }
    this.emissionColor = vec3.fromValues(0.0, 0.0, 0.0);

    this.transform = new Transform();
    this.textureMatrix = mat4.create();

    this.graphicsObject = graphicsObject;
    this.updateMinAndMaxPositions();

    this.enabled = true;

    this.instanced = instanced;
    this.instancedTransforms = new Array<Transform>();
    this.instanceVBO = null;

    if (this.instanced && this.graphicsObject != undefined) {
      this.graphicsObject.bindVAO();
      this.instanceVBO = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, 0, this.gl.STATIC_DRAW);
      graphicsObject.setupInstancedVertexAttributePointers();
      this.graphicsObject.unbindVAO();
    }

    this.layer = 0;
  }

  updateInstanceBuffer() {
    if (!this.instanced) {
      console.warn(
        "Trying to update instance buffer for a non instanced object"
      );
      return;
    }

    this.graphicsObject.bindVAO();
    let data = new Array<number>();
    this.transformsActive = 0;
    this.instancedTransforms.forEach((value, index) => {
      if (!value.enabled) {
        return;
      }
      // value.calculateMatrices();
      data.push(...value.matrix);
      this.transformsActive++;
    });

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(data),
      this.gl.DYNAMIC_DRAW
    );
    this.graphicsObject.unbindVAO();
  }

  updateMinAndMaxPositions() {
    if (this.graphicsObject != undefined) {
      const pointArray = this.graphicsObject.getVertexPositions();
      if (pointArray != undefined && pointArray.length > 0) {
        vec3.set(this.minPositions, Infinity, Infinity, Infinity);
        vec3.set(this.maxPositions, -Infinity, -Infinity, -Infinity);

        for (const point of pointArray) {
          vec3.min(this.minPositions, this.minPositions, point);
          vec3.max(this.maxPositions, this.maxPositions, point);
        }
      }
    }
  }

  getMinAndMaxPositions(): { min: vec3; max: vec3 } {
    return { min: this.minPositions, max: this.maxPositions };
  }

  draw(shaderProgram: ShaderProgram) {
    if (this.enabled) {
      this.diffuse.bind(
        shaderProgram.getTextureIndexFromSamplerUniformName("diffuse")
      );

      // only bind specular and emission if they exist on the shader and are part of material struct.
      this.specular.bind(
        shaderProgram.getTextureIndexFromSamplerUniformName("material.specular")
      );
      this.emission.bind(
        shaderProgram.getTextureIndexFromSamplerUniformName("material.emission")
      );

      let emissionColorU: [WebGLUniformLocation, boolean] =
        shaderProgram.getUniformLocation("emissionColor");
      if (emissionColorU[1]) {
        this.gl.uniform3fv(emissionColorU[0], this.emissionColor);
      }
      let modelReturn: [WebGLUniformLocation, boolean] =
        shaderProgram.getUniformLocation("modelMatrix");
      if (modelReturn[1]) {
        this.gl.uniformMatrix4fv(modelReturn[0], false, this.transform.matrix);
      }
      let textureReturn: [WebGLUniformLocation, boolean] =
        shaderProgram.getUniformLocation("textureMatrix");
      if (textureReturn[1]) {
        this.gl.uniformMatrix4fv(textureReturn[0], false, this.textureMatrix);
      }
      let normalReturn: [WebGLUniformLocation, boolean] =
        shaderProgram.getUniformLocation("normalMatrix");
      if (normalReturn[1]) {
        this.gl.uniformMatrix3fv(
          normalReturn[0],
          false,
          this.transform.normalMatrix
        );
      }

      for (let customUniform of this.customUniformsMap) {
        let customUniformReturn: [WebGLUniformLocation, boolean] =
          shaderProgram.getUniformLocation(customUniform[0]);
        if (customUniformReturn[1]) {
          customUniform[1].setUniformFunction.call(
            null,
            customUniformReturn[0],
            ...customUniform[1].args
          );
        }
      }

      if (this.instanced) {
        if (this.instancedTransforms.length <= 0) {
          return;
        }

        if (this.transformsActive <= 0) {
          return;
        }

        this.graphicsObject.bindVAO();
        this.gl.drawArraysInstanced(
          this.gl.TRIANGLES,
          0,
          this.graphicsObject.getNumVertices(),
          this.transformsActive
        );
        this.graphicsObject.unbindVAO();
      } else {
        this.graphicsObject.draw(shaderProgram);
      }

      for (let customUniform of this.customUniformsMap) {
        let customUniformReturn: [WebGLUniformLocation, boolean] =
          shaderProgram.getUniformLocation(customUniform[0]);
        if (customUniformReturn[1]) {
          customUniform[1].setUniformFunction.call(
            null,
            customUniformReturn[0],
            ...customUniform[1].defaultArgs
          );
        }
      }
    }
  }
}
