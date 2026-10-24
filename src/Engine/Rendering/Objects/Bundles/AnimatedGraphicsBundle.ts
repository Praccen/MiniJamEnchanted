import { mat3, mat4, vec3 } from "gl-matrix";
import Texture from "../../AssetHandling/Textures/Texture.js";
import GraphicsBundle from "./GraphicsBundle.js";
import GltfObject from "../../AssetHandling/GltfObject.js";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";
import AnimatedMesh from "../GraphicsObjects/AnimatedMesh.js";

export default class AnimatedGraphicsBundle extends GraphicsBundle {
  boneTextures: Texture[];
  noSkinBoneTexture: Texture;
  bindPoses: Array<mat4[]>;
  graphicsObjectAndGltfObject: {
    gos: Array<AnimatedMesh>;
    gltfObject: GltfObject;
  };
  animationTimer: number;

  diffuseTextures: Array<Texture>;

  constructor(
    gl: WebGL2RenderingContext,
    diffuse: Texture,
    specular: Texture,
    graphicsObjectAndGltfObject: {
      gos: Array<AnimatedMesh>;
      gltfObject: GltfObject;
    },
    emissionMap?: Texture,
  ) {
    super(gl, diffuse, specular, null, emissionMap, false);
    this.boneTextures = [];
    this.bindPoses = [];
    for (
      let i = 0;
      i < graphicsObjectAndGltfObject.gltfObject.skins.length;
      i++
    ) {
      this.boneTextures.push(
        new Texture(gl, false, gl.RGBA32F, gl.RGBA, gl.FLOAT),
      );
      this.bindPoses.push([]);
    }
    this.noSkinBoneTexture = new Texture(
      gl,
      false,
      gl.RGBA32F,
      gl.RGBA,
      gl.FLOAT,
    );

    this.graphicsObjectAndGltfObject = graphicsObjectAndGltfObject;
    this.animationTimer = 0.0;

    this.updateMinAndMaxPositions();
  }

  updateMinAndMaxPositions() {
    if (this.graphicsObjectAndGltfObject == undefined) {
      return;
    }
    let pointArray = [];
    for (const go of this.graphicsObjectAndGltfObject.gos) {
      pointArray.push(...go.getVertexPositions());
    }
    if (pointArray != undefined && pointArray.length > 0) {
      vec3.set(this.minPositions, Infinity, Infinity, Infinity);
      vec3.set(this.maxPositions, -Infinity, -Infinity, -Infinity);

      for (const point of pointArray) {
        vec3.min(this.minPositions, this.minPositions, point);
        vec3.max(this.maxPositions, this.maxPositions, point);
      }
    }
  }

  /**
   *
   * @param animationIndex
   * @param dt
   * @param originNode Name of the origin node
   * @param originTranslationMultiplierVector Vector to multiply the origin translation by, set this to 0 along the axises where you want to avoid movement from animation
   * @param lowerBound
   * @param upperBound
   * @returns
   */
  animate(
    animationIndex: number,
    dt: number,
    originNode: string = "",
    originTranslationMultiplierVector: vec3 = vec3.fromValues(1.0, 1.0, 1.0),
    lowerBound: number = 0.0,
    upperBound?: number,
  ): number {
    if (this.graphicsObjectAndGltfObject.gltfObject == undefined) {
      return -1;
    }

    this.animationTimer += dt;
    let timeIdx = 0;
    if (upperBound != undefined) {
      timeIdx = this.graphicsObjectAndGltfObject.gltfObject.animate(
        animationIndex,
        (this.animationTimer % (upperBound - lowerBound)) + lowerBound,
      );
    } else {
      timeIdx = this.graphicsObjectAndGltfObject.gltfObject.animate(
        animationIndex,
        this.animationTimer,
      );
    }

    for (let i = 0; i < this.bindPoses.length; i++) {
      if (this.bindPoses[i].length == 0) {
        this.bindPoses[i] =
          this.graphicsObjectAndGltfObject.gltfObject.getBindPose(i);
      }
    }

    if (originNode != "") {
      let nodeIndex =
        this.graphicsObjectAndGltfObject.gltfObject.nodeNameToIndexMap.get(
          originNode,
        );
      if (nodeIndex != undefined) {
        let originPos =
          this.graphicsObjectAndGltfObject.gltfObject.nodes[nodeIndex].transform
            .position;
        vec3.mul(originPos, originPos, originTranslationMultiplierVector);
      }
    }

    for (let i = 0; i < this.boneTextures.length; i++) {
      let boneMatrices =
        this.graphicsObjectAndGltfObject.gltfObject.getBoneMatrices(i);

      for (let j = 0; j < boneMatrices.length; j++) {
        mat4.mul(boneMatrices[j], boneMatrices[j], this.bindPoses[i][j]);
      }

      this.boneTextures[i].setTextureData(
        this.createBoneTextureData(boneMatrices),
        4,
        boneMatrices.length,
      );
    }

    return timeIdx;
  }

  private createBoneTextureData(boneMatrices: Array<mat4>): Float32Array {
    let bonesTextureData = new Float32Array(boneMatrices.length * 16);
    for (let i = 0; i < boneMatrices.length; i++) {
      for (let j = 0; j < 16; j++) {
        bonesTextureData[i * 16 + j] = boneMatrices[i][j];
      }
    }
    return bonesTextureData;
  }

  draw(shaderProgram: ShaderProgram) {
    if (!this.enabled) {
      return;
    }

    this.diffuse.bind(
      shaderProgram.getTextureIndexFromSamplerUniformName("diffuse"),
    );

    // only bind specular and emission if they exist on the shader and are part of material struct.
    this.specular.bind(
      shaderProgram.getTextureIndexFromSamplerUniformName("material.specular"),
    );
    this.emission.bind(
      shaderProgram.getTextureIndexFromSamplerUniformName("material.emission"),
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
        this.transform.normalMatrix,
      );
    }

    for (let customUniform of this.customUniformsMap) {
      let customUniformReturn: [WebGLUniformLocation, boolean] =
        shaderProgram.getUniformLocation(customUniform[0]);
      if (customUniformReturn[1]) {
        customUniform[1].setUniformFunction.call(
          null,
          customUniformReturn[0],
          ...customUniform[1].args,
        );
      }
    }

    for (
      let goIndex = 0;
      goIndex < this.graphicsObjectAndGltfObject.gos.length;
      goIndex++
    ) {
      if (
        this.diffuseTextures != undefined &&
        this.diffuseTextures.length ==
          this.graphicsObjectAndGltfObject.gos.length
      ) {
        this.diffuseTextures[goIndex].bind(
          shaderProgram.getTextureIndexFromSamplerUniformName("diffuse"),
        );
      }

      let skinId =
        this.graphicsObjectAndGltfObject.gltfObject.primitiveToSkinMap.get(
          goIndex,
        );
      if (
        skinId >= 0 &&
        skinId < this.boneTextures.length &&
        this.boneTextures[skinId] != undefined
      ) {
        this.boneTextures[skinId].bind(
          shaderProgram.getTextureIndexFromSamplerUniformName(
            "boneMatrixTexture",
          ),
        );
        if (modelReturn[1]) {
          this.gl.uniformMatrix4fv(
            modelReturn[0],
            false,
            this.transform.matrix,
          );
        }
      } else if (skinId < 0) {
        const meshId =
          this.graphicsObjectAndGltfObject.gltfObject.primitiveToMeshMap.get(
            goIndex,
          );
        if (meshId != undefined) {
          const nodeId =
            this.graphicsObjectAndGltfObject.gltfObject.meshToNodeMap.get(
              meshId,
            );
          if (
            nodeId < this.graphicsObjectAndGltfObject.gltfObject.nodes.length
          ) {
            if (modelReturn[1]) {
              this.noSkinBoneTexture.setTextureData(
                this.createBoneTextureData([
                  this.graphicsObjectAndGltfObject.gltfObject.nodes[nodeId]
                    .transform.matrix,
                ]),
                4,
                1,
              );
              this.noSkinBoneTexture.bind(
                shaderProgram.getTextureIndexFromSamplerUniformName(
                  "boneMatrixTexture",
                ),
              );
            }
          }
        }
      }
      this.graphicsObjectAndGltfObject.gos[goIndex].draw(shaderProgram);
    }

    for (let customUniform of this.customUniformsMap) {
      let customUniformReturn: [WebGLUniformLocation, boolean] =
        shaderProgram.getUniformLocation(customUniform[0]);
      if (customUniformReturn[1]) {
        customUniform[1].setUniformFunction.call(
          null,
          customUniformReturn[0],
          ...customUniform[1].defaultArgs,
        );
      }
    }
  }
}
