import ShaderProgram from "../ShaderProgram.js";

const geometryVertexShaderSrc: string = `#version 300 es
layout (location = 0) in vec3 inPosition;
layout (location = 1) in vec3 inNormal;
layout (location = 2) in vec2 inTexCoords;

uniform mat4 modelMatrix;
uniform mat4 viewProjMatrix;
uniform mat4 textureMatrix;
uniform mat3 normalMatrix;

out vec3 fragPos;
out vec3 fragNormal;
out vec2 texCoords;

void main() {
    vec4 worldPos = modelMatrix * vec4(inPosition, 1.0);
	texCoords = vec2(textureMatrix * vec4(inTexCoords, 0.0, 1.0));

	fragNormal = normalize(normalMatrix * inNormal);
	fragPos = worldPos.xyz;

    gl_Position = viewProjMatrix * worldPos;
}`;

export const geometryFragmentShaderSrc: string = `#version 300 es
precision highp float;

in vec3 fragPos;
in vec3 fragNormal;
in vec2 texCoords;

layout (location = 0) out vec4 gPosition;
layout (location = 1) out vec4 gNormal;
layout (location = 2) out vec4 gColourSpec;
layout (location = 3) out vec4 gEmissionBlur;

struct Material {
	sampler2D diffuse;
	sampler2D specular;
	sampler2D emission;
};

uniform Material material;
uniform vec3 emissionColor;

mat4 thresholdMatrix = mat4(
	1.0, 9.0, 3.0, 11.0,
	13.0, 5.0, 15.0, 7.0,
	4.0, 12.0, 2.0, 10.0,
	16.0, 8.0, 14.0, 6.0
	);

void main() {
	float opacity = texture(material.diffuse, texCoords).a;

	float threshold = thresholdMatrix[int(floor(mod(gl_FragCoord.x, 4.0)))][int(floor(mod(gl_FragCoord.y, 4.0)))] / 17.0;
  if (threshold >= opacity) {
      discard;
  }

	vec3 emissionMapValues = texture(material.emission, texCoords).rgb;
	float emissionValue = (emissionMapValues.r + emissionMapValues.g + emissionMapValues.b) / 3.0;

	if ((emissionColor.r > 0.0 || emissionColor.g > 0.0 || emissionColor.b > 0.0) && emissionValue > 0.0) {
		gEmissionBlur.r = emissionColor.r * emissionMapValues.r;
		gEmissionBlur.g = emissionColor.g * emissionMapValues.g;
		gEmissionBlur.b = emissionColor.b * emissionMapValues.b;
	}
	else if (emissionValue > 0.0) {
		gEmissionBlur.rgb = emissionMapValues;
	}
	
  gEmissionBlur.a = 0.0;
  if (opacity < 1.0) {
    gEmissionBlur.a = 1.0;
  }

  gColourSpec = vec4(texture(material.diffuse, texCoords).rgb, texture(material.specular, texCoords).r);
	gPosition = vec4(fragPos, 1.0);
	gNormal = vec4(fragNormal, 1.0);

}`;

export default class GeometryPassShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "GeometryPass",
      geometryVertexShaderSrc,
      geometryFragmentShaderSrc
    );

    this.use();
  }
}
