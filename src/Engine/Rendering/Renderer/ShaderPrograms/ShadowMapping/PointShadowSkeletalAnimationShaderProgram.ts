import ShaderProgram from "../ShaderProgram.js";
import { pointShadowFragmentShaderSrc } from "./PointShadowShaderProgram.js";

const pointShadowAnimationVertexShaderSrc: string = `#version 300 es
layout (location = 0) in vec3 inPosition;
layout (location = 1) in vec3 inNormal;
layout (location = 2) in vec2 inTexCoords;
layout (location = 3) in vec4 inWeight;
layout (location = 4) in vec4 inBoneIdx;

uniform mat4 lightSpaceMatrix;
uniform mat4 textureMatrix;
uniform mat4 modelMatrix;
uniform sampler2D boneMatrixTexture;

out vec3 fragPos;
out vec2 texCoords;

mat4 getBoneMatrix(float boneIdx) {
  return mat4(
    texelFetch(boneMatrixTexture, ivec2(0, boneIdx), 0),
    texelFetch(boneMatrixTexture, ivec2(1, boneIdx), 0),
    texelFetch(boneMatrixTexture, ivec2(2, boneIdx), 0),
    texelFetch(boneMatrixTexture, ivec2(3, boneIdx), 0));
}

void main() {
	mat4 skinMatrix =
                getBoneMatrix(inBoneIdx[0]) * inWeight[0] +
                getBoneMatrix(inBoneIdx[1]) * inWeight[1] +
                getBoneMatrix(inBoneIdx[2]) * inWeight[2] +
                getBoneMatrix(inBoneIdx[3]) * inWeight[3];

    vec4 worldPos = modelMatrix * skinMatrix * vec4(inPosition, 1.0);

	texCoords = vec2(textureMatrix * vec4(inTexCoords, 0.0, 1.0));
	fragPos = worldPos.xyz;

    gl_Position = lightSpaceMatrix * worldPos;
}`;

export default class PointShadowSkeletalAnimationShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "PointShadowSkeletalAnimation",
      pointShadowAnimationVertexShaderSrc,
      pointShadowFragmentShaderSrc,
    );

    this.use();
  }
}
