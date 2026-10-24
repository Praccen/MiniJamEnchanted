import { mat4, quat, vec3 } from "gl-matrix";
import Transform from "../../Shared/Transform.js";

const glTypeToTypedArrayMap = {
  5120: Int8Array, // gl.BYTE
  5121: Uint8Array, // gl.UNSIGNED_BYTE
  5122: Int16Array, // gl.SHORT
  5123: Uint16Array, // gl.UNSIGNED_SHORT
  5124: Int32Array, // gl.INT
  5125: Uint32Array, // gl.UNSIGNED_INT
  5126: Float32Array, // gl.FLOAT
};

const glTypeToByteSize = {
  5120: 1, // gl.BYTE
  5121: 1, // gl.UNSIGNED_BYTE
  5122: 2, // gl.SHORT
  5123: 2, // gl.UNSIGNED_SHORT
  5124: 4, // gl.INT
  5125: 4, // gl.UNSIGNED_INT
  5126: 4, // gl.FLOAT
};

const setPropertyWithoutTypeConversion = function (
  gltfNode: Object,
  nodeMemberName: string,
  object: Object,
  objectMemberName: string,
): boolean {
  if (!object.hasOwnProperty(objectMemberName)) {
    console.error(
      "Trying to set " +
        objectMemberName +
        " on " +
        object.toString() +
        ". But object doesn't have property " +
        objectMemberName,
    );
    return false;
  }
  if (gltfNode.hasOwnProperty(nodeMemberName)) {
    object[objectMemberName] = gltfNode[nodeMemberName];
    return true;
  }
  return false;
};

const setVec3 = function (
  gltfNode: Object,
  nodeMemberName: string,
  object: Object,
  objectMemberName: string,
): boolean {
  if (!object.hasOwnProperty(objectMemberName)) {
    console.error(
      "Trying to set " +
        objectMemberName +
        " on object, but object doesn't have property " +
        objectMemberName,
    );
    return false;
  }

  if (typeof object[objectMemberName] != typeof vec3) {
    console.error(
      "Trying to set vec3 property " +
        objectMemberName +
        " on object, but object member is not vec3",
    );
    return false;
  }

  if (gltfNode.hasOwnProperty(nodeMemberName)) {
    vec3.set(
      object[objectMemberName],
      gltfNode[nodeMemberName][0],
      gltfNode[nodeMemberName][1],
      gltfNode[nodeMemberName][2],
    );
    return true;
  }
  return false;
};

const setQuat = function (
  gltfNode: Object,
  nodeMemberName: string,
  object: Object,
  objectMemberName: string,
): boolean {
  if (!object.hasOwnProperty(objectMemberName)) {
    console.error(
      "Trying to set " +
        objectMemberName +
        " on object, but object doesn't have property " +
        objectMemberName,
    );
    return false;
  }

  if (typeof object[objectMemberName] != typeof quat) {
    console.error(
      "Trying to set quat property " +
        objectMemberName +
        " on object, but object member is not quat",
    );
    return false;
  }

  if (gltfNode.hasOwnProperty(nodeMemberName)) {
    quat.set(
      object[objectMemberName],
      gltfNode[nodeMemberName][0],
      gltfNode[nodeMemberName][1],
      gltfNode[nodeMemberName][2],
      gltfNode[nodeMemberName][3],
    );
    return true;
  }
  return false;
};

class GltfNode {
  name: string = "";
  transform: Transform = new Transform();
  children: number[] = new Array<number>();
  mesh: number = -1;
  skin: number = -1;
  camera: number = -1; // For now I won't care about this. TODO: Implement gltf as a scene graph for whole scenes

  constructor(gltfNode: any) {
    setPropertyWithoutTypeConversion(gltfNode, "name", this, "name");
    if (!this.setMatrix(gltfNode)) {
      setQuat(gltfNode, "rotation", this.transform, "rotation");
      setVec3(gltfNode, "scale", this.transform, "scale");
      setVec3(gltfNode, "translation", this.transform, "position");
    }
    setPropertyWithoutTypeConversion(gltfNode, "children", this, "children");
    setPropertyWithoutTypeConversion(gltfNode, "mesh", this, "mesh");
    setPropertyWithoutTypeConversion(gltfNode, "skin", this, "skin");
    setPropertyWithoutTypeConversion(gltfNode, "camera", this, "camera");
  }

  setMatrix(gltfNode): boolean {
    if (gltfNode.matrix != undefined && gltfNode.matrix.length == 16) {
      mat4.set(
        this.transform.matrix,
        gltfNode.matrix[0],
        gltfNode.matrix[1],
        gltfNode.matrix[2],
        gltfNode.matrix[3],
        gltfNode.matrix[4],
        gltfNode.matrix[5],
        gltfNode.matrix[6],
        gltfNode.matrix[7],
        gltfNode.matrix[8],
        gltfNode.matrix[9],
        gltfNode.matrix[10],
        gltfNode.matrix[11],
        gltfNode.matrix[12],
        gltfNode.matrix[13],
        gltfNode.matrix[14],
        gltfNode.matrix[15],
      );
      mat4.getRotation(this.transform.rotation, this.transform.matrix);
      mat4.getScaling(this.transform.scale, this.transform.matrix);
      mat4.getTranslation(this.transform.position, this.transform.matrix);

      return true;
    }
    return false;
  }

  setRotation(gltfNode: any) {
    if (gltfNode.rotation != undefined) {
      quat.set(
        this.transform.rotation,
        gltfNode.rotation[0],
        gltfNode.rotation[1],
        gltfNode.rotation[2],
        gltfNode.rotation[3],
      );
      return true;
    }
    return false;
  }
}

class GltfAccessor {
  bufferView: number = -1;
  componentType: number = -1;
  count: number = 0;
  byteOffset: number = 0;
  type: string = "";
  max: vec3; // TODO: figure out if these are needed or if I can just skip them because I can calculate bounds myself.
  min: vec3; // TODO: figure out if these are needed or if I can just skip them because I can calculate bounds myself.
  constructor(gltfAccessor: any) {
    setPropertyWithoutTypeConversion(
      gltfAccessor,
      "bufferView",
      this,
      "bufferView",
    );
    setPropertyWithoutTypeConversion(
      gltfAccessor,
      "componentType",
      this,
      "componentType",
    );
    setPropertyWithoutTypeConversion(gltfAccessor, "count", this, "count");
    setPropertyWithoutTypeConversion(
      gltfAccessor,
      "byteOffset",
      this,
      "byteOffset",
    );
    setPropertyWithoutTypeConversion(gltfAccessor, "type", this, "type");
  }
}

class GltfBufferView {
  buffer: number = -1;
  byteLength: number = 0;
  byteOffset: number = 0;
  byteStride: number = 0;
  target: number = -1;

  constructor(gltfBufferView: any) {
    setPropertyWithoutTypeConversion(gltfBufferView, "buffer", this, "buffer");
    setPropertyWithoutTypeConversion(
      gltfBufferView,
      "byteLength",
      this,
      "byteLength",
    );
    setPropertyWithoutTypeConversion(
      gltfBufferView,
      "byteOffset",
      this,
      "byteOffset",
    );
    setPropertyWithoutTypeConversion(
      gltfBufferView,
      "byteStride",
      this,
      "byteStride",
    );
    setPropertyWithoutTypeConversion(gltfBufferView, "target", this, "target");
  }
}

class GltfAttributes {
  POSITION: number = -1;
  NORMAL: number = -1;
  TEXCOORD_0: number = -1;
  JOINTS_0: number = -1;
  WEIGHTS_0: number = -1;
  constructor(gltfAttribute: any) {
    setPropertyWithoutTypeConversion(
      gltfAttribute,
      "POSITION",
      this,
      "POSITION",
    );
    setPropertyWithoutTypeConversion(gltfAttribute, "NORMAL", this, "NORMAL");
    setPropertyWithoutTypeConversion(
      gltfAttribute,
      "TEXCOORD_0",
      this,
      "TEXCOORD_0",
    );
    setPropertyWithoutTypeConversion(
      gltfAttribute,
      "JOINTS_0",
      this,
      "JOINTS_0",
    );
    setPropertyWithoutTypeConversion(
      gltfAttribute,
      "WEIGHTS_0",
      this,
      "WEIGHTS_0",
    );
  }
}

class GltfPrimitive {
  attributes: GltfAttributes;
  indices: number = -1;
  material: number = -1;
  constructor(gltfPrimitive: any) {
    this.attributes = new GltfAttributes(gltfPrimitive.attributes);
    setPropertyWithoutTypeConversion(gltfPrimitive, "indices", this, "indices");
    setPropertyWithoutTypeConversion(
      gltfPrimitive,
      "material",
      this,
      "material",
    );
  }
}

class GltfMesh {
  name: string = "";
  primitives: GltfPrimitive[] = new Array<GltfPrimitive>();

  constructor(gltfMesh: any) {
    setPropertyWithoutTypeConversion(gltfMesh, "name", this, "name");
    if (gltfMesh.primitives != undefined) {
      for (const primitive of gltfMesh.primitives) {
        this.primitives.push(new GltfPrimitive(primitive));
      }
    }
  }
}

class GltfMaterial {
  name: string = "";
  pbrMetallicRoughness: any = {};

  constructor(gltfMaterial: any) {
    setPropertyWithoutTypeConversion(gltfMaterial, "name", this, "name");
    setPropertyWithoutTypeConversion(
      gltfMaterial,
      "pbrMetallicRoughness",
      this,
      "pbrMetallicRoughness",
    );
  }
}

class GltfImage {
  name: string = "";
  bufferView: number = -1;
  mimeType: string = "";

  constructor(gltfImage: any) {
    setPropertyWithoutTypeConversion(gltfImage, "name", this, "name");
    setPropertyWithoutTypeConversion(
      gltfImage,
      "bufferView",
      this,
      "bufferView",
    );
    setPropertyWithoutTypeConversion(gltfImage, "mimeType", this, "mimeType");
  }
}

class GltfSkin {
  name: string = "";
  inverseBindMatrices: number = -1;
  joints: number[] = new Array<number>();

  constructor(gltfSkin: any) {
    setPropertyWithoutTypeConversion(gltfSkin, "name", this, "name");
    setPropertyWithoutTypeConversion(
      gltfSkin,
      "inverseBindMatrices",
      this,
      "inverseBindMatrices",
    );
    setPropertyWithoutTypeConversion(gltfSkin, "joints", this, "joints");
  }
}

class GltfChannel {
  sampler: number = -1;
  target: { node: number; path: string } = { node: -1, path: "" };
  constructor(gltfChannel: any) {
    setPropertyWithoutTypeConversion(gltfChannel, "sampler", this, "sampler");
    setPropertyWithoutTypeConversion(gltfChannel, "target", this, "target");
  }
}

class GltfSampler {
  input: number = -1;
  interpolation: string = "";
  output: number = -1;
  constructor(gltfSampler: any) {
    setPropertyWithoutTypeConversion(gltfSampler, "input", this, "input");
    setPropertyWithoutTypeConversion(
      gltfSampler,
      "interpolation",
      this,
      "interpolation",
    );
    setPropertyWithoutTypeConversion(gltfSampler, "output", this, "output");
  }
}

class GltfAnimation {
  name: string = "";
  channels: GltfChannel[] = new Array<GltfChannel>();
  samplers: GltfSampler[] = new Array<GltfSampler>();

  constructor(gltfAnimation: any) {
    setPropertyWithoutTypeConversion(gltfAnimation, "name", this, "name");
    if (gltfAnimation.channels != undefined) {
      for (const channel of gltfAnimation.channels) {
        this.channels.push(new GltfChannel(channel));
      }
    }

    if (gltfAnimation.samplers != undefined) {
      for (const sampler of gltfAnimation.samplers) {
        this.samplers.push(new GltfSampler(sampler));
      }
    }
  }
}

export default class GltfObject {
  ok: boolean;
  gltfJsonContent: any;
  nodes: GltfNode[];
  nodeNameToIndexMap: Map<string, number>;
  meshToSkinMap: Map<number, number>;
  meshToNodeMap: Map<number, number>;
  primitiveToSkinMap: Map<number, number>;
  primitiveToMeshMap: Map<number, number>;
  accessors: GltfAccessor[];
  bufferViews: GltfBufferView[];
  materials: GltfMaterial[];
  images: GltfImage[];
  meshes: GltfMesh[];
  skins: GltfSkin[];
  animations: GltfAnimation[];
  // TODO: Add support for scenes
  // TODO: Go scene->node->mesh and skin combo

  constructor(gltfJsonContent: any) {
    this.gltfJsonContent = gltfJsonContent;
    this.nodes = new Array<GltfNode>();
    this.nodeNameToIndexMap = new Map<string, number>();
    this.meshToSkinMap = new Map<number, number>();
    this.meshToNodeMap = new Map<number, number>();
    this.primitiveToSkinMap = new Map<number, number>();
    this.primitiveToMeshMap = new Map<number, number>();
    this.accessors = new Array<GltfAccessor>();
    this.bufferViews = new Array<GltfBufferView>();

    this.materials = new Array<GltfMaterial>();
    this.images = new Array<GltfImage>();
    this.meshes = new Array<GltfMesh>();
    this.skins = new Array<GltfSkin>();
    this.animations = new Array<GltfAnimation>();
    this.parse();
  }

  private parse() {
    if (this.gltfJsonContent.nodes != undefined) {
      for (const node of this.gltfJsonContent.nodes) {
        let i = this.nodes.push(new GltfNode(node)) - 1;
        if (this.nodes[i].name != "") {
          this.nodeNameToIndexMap.set(this.nodes[i].name, i);
        }
        if (this.nodes[i].mesh >= 0) {
          this.meshToNodeMap.set(this.nodes[i].mesh, i);
          this.meshToSkinMap.set(this.nodes[i].mesh, this.nodes[i].skin);
        }
      }
    }

    if (this.gltfJsonContent.accessors != undefined) {
      for (const accessor of this.gltfJsonContent.accessors) {
        let i = this.accessors.push(new GltfAccessor(accessor)) - 1;
      }
    }

    if (this.gltfJsonContent.bufferViews != undefined) {
      for (const bufferView of this.gltfJsonContent.bufferViews) {
        let i = this.bufferViews.push(new GltfBufferView(bufferView)) - 1;
      }
    }

    if (this.gltfJsonContent.materials != undefined) {
      for (const material of this.gltfJsonContent.materials) {
        let i = this.materials.push(new GltfMaterial(material)) - 1;
      }
    }

    if (this.gltfJsonContent.images != undefined) {
      for (const image of this.gltfJsonContent.images) {
        let i = this.images.push(new GltfImage(image)) - 1;
      }
    }

    if (this.gltfJsonContent.meshes != undefined) {
      let primitiveCounter = 0;
      for (const mesh of this.gltfJsonContent.meshes) {
        let i = this.meshes.push(new GltfMesh(mesh)) - 1;
        for (let primitive of this.meshes[i].primitives) {
          if (this.meshToSkinMap.has(i)) {
            this.primitiveToSkinMap.set(
              primitiveCounter,
              this.meshToSkinMap.get(i),
            );
          }
          this.primitiveToMeshMap.set(primitiveCounter, i);
          primitiveCounter++;
        }
      }
    }

    if (this.gltfJsonContent.skins != undefined) {
      for (const skin of this.gltfJsonContent.skins) {
        let i = this.skins.push(new GltfSkin(skin)) - 1;
      }
    }

    if (this.gltfJsonContent.animations != undefined) {
      for (const animation of this.gltfJsonContent.animations) {
        let i = this.animations.push(new GltfAnimation(animation)) - 1;
      }
    }

    // Relate children to their parents through transform.parentTransform
    for (const node of this.nodes) {
      if (node.children != undefined) {
        for (let child of node.children) {
          this.nodes[child].transform.parentTransform = node.transform;
        }
      }
    }

    this.ok = true;
    for (const accessor of this.accessors) {
      if (!this.checkBufferAccessorIntegrety(accessor)) {
        this.ok = false;
        break;
      }
    }

    // console.log(this.nodes.length);
  }

  getNumMeshes(): number {
    return this.meshes.length;
  }

  private checkBufferAccessorIntegrety(accessor: GltfAccessor): boolean {
    const bufferView = this.bufferViews[accessor.bufferView];
    let buffer = bufferView.buffer;
    let offset = bufferView.byteOffset + accessor.byteOffset;

    return (
      this.gltfJsonContent.buffers[buffer].byteLength >=
      bufferView.byteLength - offset
    );
  }

  private getBufferInfoForAccessor(accessor: GltfAccessor): {
    buffer: number;
    stride: number;
    data: any;
  } {
    const bufferView = this.bufferViews[accessor.bufferView];
    let buffer = bufferView.buffer;
    let offset = bufferView.byteOffset + accessor.byteOffset;
    let stride =
      bufferView.byteStride / glTypeToByteSize[accessor.componentType];
    let length =
      (bufferView.byteLength - accessor.byteOffset) /
      glTypeToByteSize[accessor.componentType];
    return {
      buffer: buffer,
      stride: stride,
      data: new glTypeToTypedArrayMap[accessor.componentType](
        this.gltfJsonContent.buffers[buffer],
        offset,
        length,
      ),
    };
  }

  private getBufferInfoFromAttribute(
    primitive: GltfPrimitive,
    attribute: string,
  ): { buffer: number; stride: number; data: any } {
    if (primitive.attributes[attribute] < 0) {
      return null;
    }
    return this.getBufferInfoForAccessor(
      this.accessors[primitive.attributes[attribute]],
    );
  }

  getImageData(imageIndex: number): ArrayBuffer {
    if (imageIndex >= this.images.length) {
      return null;
    }

    if (
      this.images[imageIndex].bufferView < 0 ||
      this.images[imageIndex].bufferView >= this.bufferViews.length
    ) {
      return null;
    }

    const bufferView = this.bufferViews[this.images[imageIndex].bufferView];

    if (bufferView.buffer >= this.gltfJsonContent.buffers.length) {
      return null;
    }

    const slice = (
      this.gltfJsonContent.buffers[bufferView.buffer] as ArrayBuffer
    ).slice(
      bufferView.byteOffset,
      bufferView.byteOffset + bufferView.byteLength,
    );

    return slice;
  }

  getBufferData(
    meshIdx: number,
  ): Array<{ vertexData: Float32Array; indexData: Int32Array }> {
    if (meshIdx >= this.meshes.length) {
      return null;
    }

    if (
      this.meshes[meshIdx].primitives == undefined &&
      this.meshes[meshIdx].primitives.length == 0
    ) {
      return null;
    }

    let buffers = new Array<{
      vertexData: Float32Array;
      indexData: Int32Array;
    }>();

    for (const primitive of this.meshes[meshIdx].primitives) {
      let numberOfVertices = 0;
      let numberOfIndices = 0;
      // Check that all accessors corresponding to the attributes in the primitive have the same count. If so add on to the number of vertices
      let attributesIndices = [];
      if (primitive.attributes.POSITION >= 0) {
        attributesIndices.push(primitive.attributes.POSITION);
      }
      if (primitive.attributes.NORMAL >= 0) {
        attributesIndices.push(primitive.attributes.NORMAL);
      }
      if (primitive.attributes.TEXCOORD_0 >= 0) {
        attributesIndices.push(primitive.attributes.TEXCOORD_0);
      }
      if (primitive.attributes.JOINTS_0 >= 0) {
        attributesIndices.push(primitive.attributes.JOINTS_0);
      }
      if (primitive.attributes.WEIGHTS_0 >= 0) {
        attributesIndices.push(primitive.attributes.WEIGHTS_0);
      }

      if (attributesIndices.length == 0) {
        continue;
      }
      let count = this.accessors[attributesIndices[0]].count;
      for (let i = 1; i < attributesIndices.length; i++) {
        if (this.accessors[attributesIndices[i]].count != count) {
          count = -1;
          break;
        }
      }

      if (count < 0) {
        continue;
      }

      numberOfVertices = count;

      let bufferIndex =
        buffers.push({
          vertexData: new Float32Array(numberOfVertices * 16),
          indexData: null,
        }) - 1;

      let positionsBufferInfo = this.getBufferInfoFromAttribute(
        primitive,
        "POSITION",
      );
      let normalBufferInfo = this.getBufferInfoFromAttribute(
        primitive,
        "NORMAL",
      );
      let texCoordsBufferInfo = this.getBufferInfoFromAttribute(
        primitive,
        "TEXCOORD_0",
      );
      let weightsBufferInfo = this.getBufferInfoFromAttribute(
        primitive,
        "WEIGHTS_0",
      );
      let jointsBufferInfo = this.getBufferInfoFromAttribute(
        primitive,
        "JOINTS_0",
      );

      for (let i = 0; i < numberOfVertices; i++) {
        // vec3 inPosition
        let o = 0;
        let stride = 3;
        for (let j = 0; j < stride; j++) {
          if (positionsBufferInfo == undefined) {
            buffers[bufferIndex].vertexData[i * 16 + o] = 0.0;
          } else {
            buffers[bufferIndex].vertexData[i * 16 + o] =
              positionsBufferInfo.data[
                i * Math.max(stride, positionsBufferInfo.stride) + j
              ];
          }
          o++;
        }
        // vec3 inNormal
        stride = 3;
        for (let j = 0; j < stride; j++) {
          if (normalBufferInfo == undefined) {
            buffers[bufferIndex].vertexData[i * 16 + o] = 1.0;
          } else {
            buffers[bufferIndex].vertexData[i * 16 + o] =
              normalBufferInfo.data[
                i * Math.max(stride, normalBufferInfo.stride) + j
              ];
          }
          o++;
        }
        // vec2 inTexCoords
        stride = 2;
        for (let j = 0; j < stride; j++) {
          if (texCoordsBufferInfo == undefined) {
            buffers[bufferIndex].vertexData[i * 16 + o] = 0.0;
          } else {
            buffers[bufferIndex].vertexData[i * 16 + o] = Math.abs(
              j -
                texCoordsBufferInfo.data[
                  i * Math.max(stride, texCoordsBufferInfo.stride) + j
                ],
            ); // This flips the y-coordinate
          }
          o++;
        }
        // vec4 inWeight
        stride = 4;
        for (let j = 0; j < stride; j++) {
          if (weightsBufferInfo == undefined) {
            buffers[bufferIndex].vertexData[i * 16 + o] = 1.0;
          } else {
            buffers[bufferIndex].vertexData[i * 16 + o] =
              weightsBufferInfo.data[
                i * Math.max(stride, weightsBufferInfo.stride) + j
              ];
          }
          o++;
        }
        // vec4 inBoneIdx; 12
        stride = 4;
        for (let j = 0; j < stride; j++) {
          if (jointsBufferInfo == undefined) {
            buffers[bufferIndex].vertexData[i * 16 + o] = 0.0;
          } else {
            buffers[bufferIndex].vertexData[i * 16 + o] =
              jointsBufferInfo.data[
                i * Math.max(stride, jointsBufferInfo.stride) + j
              ];
          }
          o++;
        }
      }

      if (primitive.indices < 0) {
        continue;
      }

      numberOfIndices += this.accessors[primitive.indices].count;

      buffers[bufferIndex].indexData = new Int32Array(numberOfIndices);

      let indicesBufferInfo = this.getBufferInfoForAccessor(
        this.accessors[primitive.indices],
      );
      for (let i = 0; i < numberOfIndices; i++) {
        buffers[bufferIndex].indexData[i] =
          indicesBufferInfo.data[i * (1 + indicesBufferInfo.stride)];
      }
    }
    return buffers;
  }

  getBindPose(skinIdx: number): Array<mat4> {
    if (skinIdx >= this.skins.length) {
      return [mat4.create()];
    }

    let inverseBindMatricesBufferInfo = this.getBufferInfoForAccessor(
      this.accessors[this.skins[skinIdx].inverseBindMatrices],
    );
    let inverseBindMatrices = new Array<mat4>();
    let ibd = inverseBindMatricesBufferInfo.data;

    for (let i = 0; i < ibd.length; i += 16) {
      let offset = i * Math.max(1, inverseBindMatricesBufferInfo.stride);
      inverseBindMatrices.unshift(
        mat4.fromValues(
          ibd[offset + 0],
          ibd[offset + 1],
          ibd[offset + 2],
          ibd[offset + 3],
          ibd[offset + 4],
          ibd[offset + 5],
          ibd[offset + 6],
          ibd[offset + 7],
          ibd[offset + 8],
          ibd[offset + 9],
          ibd[offset + 10],
          ibd[offset + 11],
          ibd[offset + 12],
          ibd[offset + 13],
          ibd[offset + 14],
          ibd[offset + 15],
        ),
      );
    }
    return inverseBindMatrices;
  }

  getBoneMatrices(skinIdx: number): Array<mat4> {
    let boneMatrices = new Array<mat4>();
    if (this.skins.length == 0) {
      // No skins available, use only one identity matrix
      boneMatrices.push(mat4.create());
    }

    for (const node of this.nodes) {
      node.transform.calculateAnimationMatrix();
    }

    if (skinIdx >= this.skins.length) {
      return boneMatrices;
    }

    for (const joint of this.skins[skinIdx].joints) {
      boneMatrices.unshift(this.nodes[joint].transform.matrix);
    }

    return boneMatrices;
  }

  getNumAnimations(): number {
    return this.animations.length;
  }

  animate(animationIdx: number, time: number): number {
    if (animationIdx >= this.animations.length) {
      return;
    }

    let timelineIndex = 0;
    const animation = this.animations[animationIdx];

    // Start by getting all timelines so we don't have to do it more than once per input
    let timelinesMap = new Map<number, number[]>();

    for (const channel of animation.channels) {
      if (timelinesMap.has(animation.samplers[channel.sampler].input)) {
        continue;
      }

      let inputBufferInfo = this.getBufferInfoForAccessor(
        this.accessors[animation.samplers[channel.sampler].input],
      );
      let timeline = new Array<number>();

      for (
        let i = 0;
        i < inputBufferInfo.data.length;
        i += Math.max(1, inputBufferInfo.stride)
      ) {
        timeline.push(inputBufferInfo.data[i]);
      }

      timelinesMap.set(animation.samplers[channel.sampler].input, timeline);
    }

    let timelineIndexMap = new Map<number, number>();
    // Figure out what index the time represents in all timelines
    timelinesMap.forEach((value, key) => {
      let max = -Infinity;
      let min = Infinity;
      value.forEach((value) => {
        max = Math.max(value, max);
        min = Math.min(value, min);
      });

      let timeModolo = min + (time % (max - min));

      for (let i = 0; i < value.length; i++) {
        if (timeModolo > value[i]) {
          timelineIndex = i;
        } else {
          break;
        }
      }

      timelineIndexMap.set(key, timelineIndex);
    });

    // Then go through the channels to update the targets using the samplers output
    for (const channel of animation.channels) {
      let outputBufferInfo = this.getBufferInfoForAccessor(
        this.accessors[animation.samplers[channel.sampler].output],
      );
      const idx = timelineIndexMap.get(
        animation.samplers[channel.sampler].input,
      );
      if (channel.target.path == "translation") {
        let translationIndex = idx * Math.max(3, outputBufferInfo.stride);
        vec3.set(
          this.nodes[channel.target.node].transform.position,
          outputBufferInfo.data[translationIndex],
          outputBufferInfo.data[translationIndex + 1],
          outputBufferInfo.data[translationIndex + 2],
        );
      }
      if (channel.target.path == "rotation") {
        let rotationIndex = idx * Math.max(4, outputBufferInfo.stride);
        quat.set(
          this.nodes[channel.target.node].transform.rotation,
          outputBufferInfo.data[rotationIndex],
          outputBufferInfo.data[rotationIndex + 1],
          outputBufferInfo.data[rotationIndex + 2],
          outputBufferInfo.data[rotationIndex + 3],
        );
      }
      if (channel.target.path == "scale") {
        let scaleIndex = idx * Math.max(3, outputBufferInfo.stride);
        vec3.set(
          this.nodes[channel.target.node].transform.scale,
          outputBufferInfo.data[scaleIndex],
          outputBufferInfo.data[scaleIndex + 1],
          outputBufferInfo.data[scaleIndex + 2],
        );
      }
    }
    return timelineIndex;
  }
}
