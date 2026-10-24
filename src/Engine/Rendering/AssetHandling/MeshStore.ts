import AnimatedMesh from "../Objects/GraphicsObjects/AnimatedMesh.js";
import GraphicsObject from "../Objects/GraphicsObjects/GraphicsObject.js";
import Heightmap from "../Objects/GraphicsObjects/Heightmap.js";
import Mesh from "../Objects/GraphicsObjects/Mesh.js";
import RendererBase from "../Renderer/RendererBase.js";
import GltfObject from "./GltfObject.js";
import Texture from "./Textures/Texture.js";
import TextureStore from "./TextureStore.js";
import { vec2, vec3 } from "gl-matrix";

export default class MeshStore {
  private renderer: RendererBase;
  private meshMap: Map<string, Mesh>;
  private animatedMeshMap: Map<
    string,
    {
      gos: Array<AnimatedMesh>;
      gltfObject: GltfObject;
      diffuseTextures?: Array<Texture>;
    }
  >;
  private heightmapMap: Map<string, Heightmap>;
  private textureStore: TextureStore;

  constructor(renderer: RendererBase, textureStore: TextureStore) {
    this.renderer = renderer;
    this.meshMap = new Map<string, Mesh>();
    this.animatedMeshMap = new Map<
      string,
      { gos: Array<AnimatedMesh>; gltfObject: GltfObject }
    >();
    this.heightmapMap = new Map<string, Heightmap>();
    this.textureStore = textureStore;
  }

  /**
   * This function will load all meshes in paths. Invalid paths will result in an error in the console, but won't break functionality.
   * @param paths Array of strings containing the paths to load
   * @param progress Object with member loaded which will reflect how many meshes has currently been loaded
   * @returns Promise<void> that resolves when all meshes has been loaded
   */
  async loadMeshes(
    paths: Array<string>,
    progress: { loaded: number },
  ): Promise<void> {
    return new Promise<void>((resolve, rejects) => {
      progress.loaded = 0;
      if (paths.length == 0) {
        resolve();
      }

      let loaded = () => {
        progress.loaded++;
        if (progress.loaded == paths.length) {
          resolve();
        }
      };

      for (let path of paths) {
        if (path.endsWith("gltf") || path.endsWith("glb")) {
          this.loadAmimatedMesh(path).then((mesh) => {
            this.animatedMeshMap.set(path, mesh);
            loaded();
          });
        } else if (
          path.endsWith("png") ||
          path.endsWith("jpg") ||
          path.endsWith("jpeg")
        ) {
          this.loadHightmap(path).then((heightmap) => {
            this.heightmapMap.set(path, heightmap);
            loaded();
          });
        } else {
          this.loadMesh(path).then((mesh) => {
            this.meshMap.set(path, mesh);
            loaded();
          });
        }
      }
    });
  }

  private async loadMesh(path: string): Promise<Mesh> {
    return new Promise<Mesh>(async (resolve, reject) => {
      let newlyCreatedMesh = new Mesh(this.renderer.gl, null);
      let data = await this.parseObjContent(path);
      newlyCreatedMesh.setVertexData(data);
      resolve(newlyCreatedMesh);
    });
  }

  private async loadHightmap(
    path: string,
    useTextureSizeForResolution: boolean = true,
    x: number = 2,
    y: number = 2,
    sizePerX: number = 1.0,
    sizePerY: number = 1.0,
  ): Promise<Heightmap> {
    return new Promise<Heightmap>(async (resolve, reject) => {
      let newHeightmap = new Heightmap(this.renderer.gl);
      if (!useTextureSizeForResolution) {
        newHeightmap.createPlane(x, y, sizePerX, sizePerY);
      }
      await newHeightmap.readHeightDataFromTexture(
        path,
        useTextureSizeForResolution,
      );
      resolve(newHeightmap);
    });
  }

  private async loadAmimatedMesh(path: string): Promise<{
    gos: Array<AnimatedMesh>;
    gltfObject: GltfObject;
    diffuseTextures?: Array<Texture>;
  }> {
    return new Promise<{
      gos: Array<AnimatedMesh>;
      gltfObject: GltfObject;
      diffuseTextures?: Array<Texture>;
    }>(async (resolve, reject) => {
      const gltfObject = await this.parseGltfContent(path);
      let newlyCreatedMesh = {
        gos: [],
        gltfObject: gltfObject,
        diffuseTextures: [],
      };
      if (!gltfObject.ok || gltfObject.getNumMeshes() == 0) {
        console.error(
          "glTF file " + path + " couldn't load one or more binary files",
        );
        reject("glTF file " + path + " couldn't load one or more binary files");
      }

      for (let meshIdx = 0; meshIdx < gltfObject.meshes.length; meshIdx++) {
        const data = gltfObject.getBufferData(meshIdx);
        for (const primitive of data) {
          const index =
            newlyCreatedMesh.gos.push(
              new AnimatedMesh(this.renderer.gl, primitive.vertexData),
            ) - 1;
          if (primitive.indexData.length > 0) {
            newlyCreatedMesh.gos[index].setIndexData(primitive.indexData);
          }
        }

        for (const primitive of gltfObject.meshes[meshIdx].primitives) {
          if (primitive.material < gltfObject.materials.length) {
            if (
              gltfObject.materials[primitive.material].pbrMetallicRoughness !=
                undefined &&
              gltfObject.materials[primitive.material].pbrMetallicRoughness
                .baseColorFactor != undefined
            ) {
              const baseColorFactor =
                gltfObject.materials[primitive.material].pbrMetallicRoughness
                  .baseColorFactor;
              if (baseColorFactor.length == 3) {
                newlyCreatedMesh.diffuseTextures.push(
                  this.textureStore.getTexture(
                    "CSS:rgb(" +
                      255 * baseColorFactor[0] +
                      "," +
                      255 * baseColorFactor[1] +
                      "," +
                      255 * baseColorFactor[2] +
                      ")",
                  ),
                );
              } else if (baseColorFactor.length == 4) {
                newlyCreatedMesh.diffuseTextures.push(
                  this.textureStore.getTexture(
                    "CSS:rgba(" +
                      255 * baseColorFactor[0] +
                      "," +
                      255 * baseColorFactor[1] +
                      "," +
                      255 * baseColorFactor[2] +
                      "," +
                      baseColorFactor[3] +
                      ")",
                  ),
                );
              }
            }
          }
        }
      }

      for (
        let imageIndex = 0;
        imageIndex < newlyCreatedMesh.gltfObject.images.length;
        imageIndex++
      ) {
        let content = newlyCreatedMesh.gltfObject.getImageData(imageIndex);
        if (content == undefined) {
          continue;
        }

        let texture = new Texture(this.renderer.gl);
        texture.loadFromFileContent(
          newlyCreatedMesh.gltfObject.images[imageIndex].mimeType,
          content,
        );
        if (
          newlyCreatedMesh.gltfObject.images[imageIndex].name != undefined &&
          newlyCreatedMesh.gltfObject.images[imageIndex].name != ""
        ) {
          this.textureStore.setTexture(
            newlyCreatedMesh.gltfObject.images[imageIndex].name,
            texture,
          );
        } else {
          this.textureStore.setTexture(path + "/" + imageIndex, texture);
        }
      }
      resolve(newlyCreatedMesh);
    });
  }

  getMesh(path: string): GraphicsObject {
    let mesh = this.meshMap.get(path);
    if (mesh) {
      return mesh;
    }

    throw Error("Model retrieved before loaded: " + path);
  }

  getHeightmap(path: string): Heightmap {
    let heightmap = this.heightmapMap.get(path);
    if (heightmap) {
      return heightmap;
    }

    throw Error("Heightmap retrieved before loaded: " + path);
  }

  getAnimatedMesh(path: string): {
    gos: Array<AnimatedMesh>;
    gltfObject: GltfObject;
    diffuseTextures?: Array<Texture>;
  } {
    let mesh = this.animatedMeshMap.get(path);
    if (mesh) {
      return mesh;
    }

    throw Error("Mesh retrieved before loaded: " + path);
  }

  private async parseObjContent(meshPath: string): Promise<Float32Array> {
    /*
		https://webglfundamentals.org/webgl/lessons/webgl-load-obj.html
		*/

    const response = await fetch(meshPath);
    const objContent = await response.text();

    let lines = objContent.split("\r\n");
    if (lines.length == 1) {
      lines = objContent.split("\n");
    }

    let vertexPositions = new Array<vec3>();
    let vertexTexCoords = new Array<vec2>();
    let vertexNormals = new Array<vec3>();
    let vertices = new Array<{
      posIndex: number;
      texCoordIndex: number;
      normalIndex: number;
      mtlIndex: number;
    }>();
    let mtls = new Map<
      string,
      {
        diffuseColor: vec3;
        specularColor: vec3;
        emissionColor: vec3;
        dissolve: number;
        mapDiffuse: string;
        spriteIndex: number;
      }
    >();
    let usingMtl: string = "";

    for (let line of lines) {
      line = line.trim();

      if (line.startsWith("mtllib")) {
        const mtlName = line.split(/\s+/).filter((element) => {
          return element != "mtllib";
        });
        if (mtlName.length == 1) {
          let mtlPath =
            meshPath.substring(0, meshPath.lastIndexOf("/") + 1) + mtlName;
          try {
            const mtlResponse = await fetch(mtlPath);

            if (mtlResponse.ok) {
              const mtlContent = await mtlResponse.text();
              let lastMtl: string = "";
              let index = 0;

              let mtlLines = mtlContent.split("\r\n");
              if (mtlLines.length == 1) {
                mtlLines = mtlContent.split("\n");
              }

              for (const row of mtlLines) {
                if (row.startsWith("newmtl")) {
                  let splitRow = row.split(/\s+/);
                  if (splitRow.length > 1) {
                    lastMtl = splitRow[1];
                    mtls.set(lastMtl, {
                      diffuseColor: vec3.create(),
                      specularColor: vec3.create(),
                      emissionColor: vec3.create(),
                      dissolve: 1.0,
                      mapDiffuse: "",
                      spriteIndex: index,
                    });
                    index++;
                  }
                } else if (row.startsWith("Kd") && lastMtl != "") {
                  const colorValues = row.split(/\s+/).filter((element) => {
                    return element != "Kd";
                  });
                  if (colorValues.length > 2) {
                    vec3.set(
                      mtls.get(lastMtl).diffuseColor,
                      parseFloat(colorValues[0]),
                      parseFloat(colorValues[1]),
                      parseFloat(colorValues[2]),
                    );
                  }
                } else if (row.startsWith("Ks") && lastMtl != "") {
                  const colorValues = row.split(/\s+/).filter((element) => {
                    return element != "Ks";
                  });
                  if (colorValues.length > 2) {
                    vec3.set(
                      mtls.get(lastMtl).specularColor,
                      parseFloat(colorValues[0]),
                      parseFloat(colorValues[1]),
                      parseFloat(colorValues[2]),
                    );
                  }
                } else if (row.startsWith("Ke") && lastMtl != "") {
                  const colorValues = row.split(/\s+/).filter((element) => {
                    return element != "Ke";
                  });
                  if (colorValues.length > 2) {
                    vec3.set(
                      mtls.get(lastMtl).emissionColor,
                      parseFloat(colorValues[0]),
                      parseFloat(colorValues[1]),
                      parseFloat(colorValues[2]),
                    );
                  }
                } else if (row.startsWith("d") && lastMtl != "") {
                  const colorValues = row.split(/\s+/).filter((element) => {
                    return element != "d";
                  });
                  if (colorValues.length > 0) {
                    mtls.get(lastMtl).dissolve = parseFloat(colorValues[0]);
                  }
                } else if (row.startsWith("map_Kd") && lastMtl != "") {
                  const mapName = row.split(/\s+/)[row.split(/\s+/).length - 1];
                  if (mapName.length > 0) {
                    mtls.get(lastMtl).mapDiffuse = mapName;
                  }
                }
              }

              let diffuseTextureData = new Uint8Array(index * 4);
              for (let mtl of mtls) {
                diffuseTextureData[mtl[1].spriteIndex * 4 + 0] =
                  mtl[1].diffuseColor[0] * 255;
                diffuseTextureData[mtl[1].spriteIndex * 4 + 1] =
                  mtl[1].diffuseColor[1] * 255;
                diffuseTextureData[mtl[1].spriteIndex * 4 + 2] =
                  mtl[1].diffuseColor[2] * 255;
                diffuseTextureData[mtl[1].spriteIndex * 4 + 3] =
                  mtl[1].dissolve * 255;
              }
              let tempTexture = new Texture(this.renderer.gl, false);
              tempTexture.setTextureData(diffuseTextureData, index, 1);
              this.textureStore.setTexture(mtlPath, tempTexture);

              let specularTextureData = new Uint8Array(index * 4);
              for (let mtl of mtls) {
                specularTextureData[mtl[1].spriteIndex * 4 + 0] =
                  mtl[1].specularColor[0] * 255;
                specularTextureData[mtl[1].spriteIndex * 4 + 1] =
                  mtl[1].specularColor[1] * 255;
                specularTextureData[mtl[1].spriteIndex * 4 + 2] =
                  mtl[1].specularColor[2] * 255;
                specularTextureData[mtl[1].spriteIndex * 4 + 3] = 255;
              }
              tempTexture = new Texture(this.renderer.gl, false);
              tempTexture.setTextureData(specularTextureData, index, 1);
              this.textureStore.setTexture(
                mtlPath.substring(0, mtlPath.length - 4) + "_spec.mtl",
                tempTexture,
              );

              let emissionTextureData = new Uint8Array(index * 4);
              for (let mtl of mtls) {
                emissionTextureData[mtl[1].spriteIndex * 4 + 0] =
                  mtl[1].emissionColor[0] * 255;
                emissionTextureData[mtl[1].spriteIndex * 4 + 1] =
                  mtl[1].emissionColor[1] * 255;
                emissionTextureData[mtl[1].spriteIndex * 4 + 2] =
                  mtl[1].emissionColor[2] * 255;
                emissionTextureData[mtl[1].spriteIndex * 4 + 3] = 255;
              }
              tempTexture = new Texture(this.renderer.gl, false);
              tempTexture.setTextureData(emissionTextureData, index, 1);
              this.textureStore.setTexture(
                mtlPath.substring(0, mtlPath.length - 4) + "_emission.mtl",
                tempTexture,
              );
            }
          } catch (e) {}
        }
      } else if (line.startsWith("usemtl") && mtls.size > 0) {
        usingMtl = line.split(/\s+/)[1];
      } else if (line.startsWith("vt")) {
        // Texture coordinates
        const coords = line.split(/\s+/).filter((element) => {
          return element != "vt";
        });
        vertexTexCoords.push(
          vec2.fromValues(parseFloat(coords[0]), parseFloat(coords[1])),
        );
      } else if (line.startsWith("vn")) {
        // Normal
        const coords = line.split(/\s+/).filter((element) => {
          return element != "vn";
        });
        vertexNormals.push(
          vec3.fromValues(
            parseFloat(coords[0]),
            parseFloat(coords[1]),
            parseFloat(coords[2]),
          ),
        );
      } else if (line.startsWith("v")) {
        // Position
        const coords = line.split(/\s+/).filter((element) => {
          return element != "v";
        });
        vertexPositions.push(
          vec3.fromValues(
            parseFloat(coords[0]),
            parseFloat(coords[1]),
            parseFloat(coords[2]),
          ),
        );
      } else if (line.startsWith("f")) {
        // Faces
        const coords = line.split(/\s+/).filter((element) => {
          return element != "f";
        });
        for (let i = 0; i < coords.length - 2; i++) {
          for (let j = 0; j < 3; j++) {
            let index = j == 0 ? 0 : i + j; // 0 if j is zero, otherwize i +j
            const indices = coords[index].split("/");

            const last = vertices.push({
              posIndex: NaN,
              texCoordIndex: NaN,
              normalIndex: NaN,
              mtlIndex: NaN,
            });
            if (indices.length > 0) {
              vertices[last - 1].posIndex = parseInt(indices[0]) - 1;
            }

            if (indices.length > 1) {
              vertices[last - 1].texCoordIndex = parseInt(indices[1]) - 1; // Can be empty, texCoordIndex will then be NaN
            }

            if (indices.length > 2) {
              vertices[last - 1].normalIndex = parseInt(indices[2]) - 1;
            }

            if (usingMtl != "") {
              const mtl = mtls.get(usingMtl);
              if (mtl != undefined) {
                if (mtl.mapDiffuse == "") {
                  vertices[last - 1].mtlIndex = mtl.spriteIndex;
                }
              } else {
                console.warn("usemtl " + usingMtl + ", there is no such mtl");
              }
            }
          }
        }
      } else if (line.startsWith("#")) {
        // A comment, ignore
      } else if (line.length > 0) {
        // Unhandled keywords
        // console.warn("OBJ loader: Unhandled keyword " + line.split(/\s+/)[0]);
      }
    }

    let returnArr = new Float32Array(vertices.length * 8); // 3 * pos + 3 * norm + 2 * tx

    for (let i = 0; i < vertices.length; i++) {
      if (!isNaN(vertices[i].posIndex)) {
        returnArr[i * 8] = vertexPositions[vertices[i].posIndex][0];
        returnArr[i * 8 + 1] = vertexPositions[vertices[i].posIndex][1];
        returnArr[i * 8 + 2] = vertexPositions[vertices[i].posIndex][2];
      } else {
        returnArr[i * 8] = 0.0;
        returnArr[i * 8 + 1] = 0.0;
        returnArr[i * 8 + 2] = 0.0;
      }

      if (!isNaN(vertices[i].normalIndex)) {
        returnArr[i * 8 + 3] = vertexNormals[vertices[i].normalIndex][0];
        returnArr[i * 8 + 4] = vertexNormals[vertices[i].normalIndex][1];
        returnArr[i * 8 + 5] = vertexNormals[vertices[i].normalIndex][2];
      } else {
        returnArr[i * 8 + 3] = 1.0;
        returnArr[i * 8 + 4] = 0.0;
        returnArr[i * 8 + 5] = 0.0;
      }

      if (!isNaN(vertices[i].mtlIndex)) {
        // TODO: This breaks uvs (obviously) so currently we don't set the mtlIndex if there is a map_Kd specified. This whole system of combining diffuse values to one sprite map should probably not be this way.
        returnArr[i * 8 + 6] =
          vertices[i].mtlIndex / mtls.size + 0.5 / mtls.size;
        returnArr[i * 8 + 7] = 0.5;
      } else if (!isNaN(vertices[i].texCoordIndex)) {
        returnArr[i * 8 + 6] = vertexTexCoords[vertices[i].texCoordIndex][0];
        returnArr[i * 8 + 7] = vertexTexCoords[vertices[i].texCoordIndex][1];
      } else {
        returnArr[i * 8 + 6] = 0.0;
        returnArr[i * 8 + 7] = 0.0;
      }
    }
    return returnArr;
  }

  private async parseGltfContent(meshPath: string): Promise<GltfObject> {
    const response = await fetch(meshPath);

    let gltfContent: any;

    if (meshPath.endsWith("glb")) {
      const arrayBuffer = await (await fetch(meshPath)).arrayBuffer();

      // https://www.khronos.org/files/gltf20-reference-guide.pdf

      // 12 byte header - 4 byte magic, 4 byte version, 4 byte length of whole file
      const decoder = new TextDecoder("utf-8");

      const magic = decoder.decode(arrayBuffer.slice(0, 4));
      if (magic != "glTF") {
        return null;
      }

      const version = new Int32Array(arrayBuffer.slice(4, 8))[0];
      const length = new Int32Array(arrayBuffer.slice(8, 12))[0];

      // Chunks are serial, starting with 4 byte chunk length, followed by 4 byte chunk type

      let offset = 12;
      let bufferCounter = 0;

      while (offset < arrayBuffer.byteLength) {
        const chunkLength = new Int32Array(
          arrayBuffer.slice(offset, offset + 4),
        )[0];
        const chunkType = decoder.decode(
          arrayBuffer.slice(offset + 4, offset + 8),
        );

        offset += 8;

        if (chunkType.startsWith("JSON")) {
          const jsonString = decoder.decode(
            arrayBuffer.slice(offset, offset + chunkLength),
          );
          try {
            gltfContent = JSON.parse(jsonString);
          } catch (e: any) {
            console.warn(
              "JSON parse error when parsing " + meshPath + ": " + e.message,
            );
            return null;
          }
        } else if (chunkType.startsWith("BIN")) {
          if (gltfContent.buffers == undefined) {
            console.warn(
              "Parsing glb chunk of type bin before json chunk in file " +
                meshPath,
            );
            return null;
          }
          gltfContent.buffers[bufferCounter] = arrayBuffer.slice(
            offset,
            offset + chunkLength,
          );
          bufferCounter++;
        }
        offset += chunkLength;
      }
    } else if (meshPath.endsWith("gltf")) {
      gltfContent = await response.json();
      const baseURL = new URL(meshPath, location.href);

      gltfContent.buffers = await Promise.all(
        gltfContent.buffers.map(async (buffer) => {
          const url = new URL(buffer.uri, baseURL.href);
          const binResponse = await fetch(url);
          return await binResponse.arrayBuffer();
        }),
      );
    }

    return new GltfObject(gltfContent);
  }
}
