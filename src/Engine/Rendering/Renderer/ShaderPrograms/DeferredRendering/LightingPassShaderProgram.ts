import ShaderProgram from "../ShaderProgram.js";
import { screenQuadVertexSrc } from "../ScreenQuadShaderProgram.js";
import {
  pointLightsToAllocate,
  pointShadowsToAllocate,
} from "../../RendererBase.js";

function getFragSrc() {
  let lightingFragmentShaderSrc =
    `#version 300 es
	precision highp float;

	in vec2 texCoords;
	
	layout (location = 0) out vec4 final_colour;
  	layout (location = 1) out float blurMask;
	
	uniform sampler2D gPosition;
	uniform sampler2D gNormal;
	uniform sampler2D gColourSpec;
	uniform sampler2D gEmissionBlur;
	uniform sampler2D depthMap;
	uniform samplerCube pointDepthMaps[` +
    pointShadowsToAllocate +
    `];
	
	struct PointLight {
	vec3 position;
	vec3 colour;
	
	float constant;
	float linear;
	float quadratic;
	
	int pointDepthMapIndex;
	};
	
	struct DirectionalLight {
	vec3 direction;
	vec3 colour;
	float ambientMultiplier;
	};
	
	uniform DirectionalLight directionalLight;
	uniform PointLight pointLights[` +
    pointLightsToAllocate +
    `];
	uniform int nrOfPointLights;
	uniform vec3 camPos; //Used for specular lighting
	uniform mat4 lightSpaceMatrix; // Used for shadow fragment position
	
	vec3 CalcDirectionalLight(DirectionalLight light, vec3 normal, vec3 cameraDir, vec3 diffuse, float specular, float shininess, vec4 lightSpaceFragPos);
	vec3 CalcPointLight(PointLight light, vec3 normal, vec3 fragPos, vec3 cameraDir, vec3 diffuse, float specular, float shininess);
	float CalcShadow(vec4 lightSpaceFragPos, vec3 normal);
	float CalcPointShadow(vec3 fragPos, PointLight light);
	
	void main() {
	// Discard fragment if normal alpha is 0
	vec4 fragNormalWithAlpha = texture(gNormal, texCoords);
	if (fragNormalWithAlpha.a <= 0.0001) {
		discard;
	}
	
	vec3 fragPos = texture(gPosition, texCoords).rgb;
	vec3 fragNormal = fragNormalWithAlpha.rgb;
	float shininess = 32.0f;
	vec3 diffuse = texture(gColourSpec, texCoords).rgb;
	float specular = texture(gColourSpec, texCoords).a;
	vec3 emission = texture(gEmissionBlur, texCoords).rgb;
	vec4 lightSpaceFragPos = (lightSpaceMatrix * vec4(fragPos, 1.0f));
	
	vec3 cameraDir = normalize(camPos - fragPos); //Direction vector from fragment to camera
	
	vec3 result = vec3(0.0f);
	result += CalcDirectionalLight(directionalLight, fragNormal, cameraDir, diffuse, specular, shininess, lightSpaceFragPos);
	
	for (int i = 0; i < nrOfPointLights; i++) {
		result += CalcPointLight(pointLights[i], fragNormal, fragPos, cameraDir, diffuse, specular, shininess);
	}
	
	final_colour = vec4(result + emission, 1.0f); // Set colour of fragment. Since we use screen door transparency, do not use alpha value
  blurMask = texture(gEmissionBlur, texCoords).a;
	
	// final_colour.rgb = fragPos;
	// final_colour.rgb = fragNormal;
	// final_colour.rgb = diffuse;
	// final_colour.rgb = vec3(specular, specular, specular);
	// final_colour.rgb = texture(depthMap, texCoords).rrr;
	}
	
	// Calculates the colour when using a directional light
	vec3 CalcDirectionalLight(DirectionalLight light, vec3 normal, vec3 cameraDir, vec3 diffuse, float specular, float shininess, vec4 lightSpaceFragPos) {
	vec3 lightDir = normalize(-light.direction); //light direction from the fragment position
	
	// Diffuse shading
	float diff = max(dot(normal, lightDir), 0.0);
	float oppositeDiff = min(dot(normal, lightDir), 0.0);
	oppositeDiff += 1.0;
	oppositeDiff *= 0.2;
	
	// Specular shading
	vec3 reflectDir = reflect(-lightDir, normal);
	float spec = pow(max(dot(cameraDir, reflectDir), 0.0), shininess);
	
	// Combine results	
	vec3 ambient = light.colour * light.ambientMultiplier * 0.33 + diffuse * light.ambientMultiplier * 0.67; //Ambient lighting
	vec3 finalDiffuse = light.colour * diff * diffuse;
	vec3 finalSpecular = light.colour * spec * specular;
	
	float shadow = CalcShadow(lightSpaceFragPos, normal);
	vec3 lighting = (ambient + (1.0f - shadow) * (finalDiffuse + finalSpecular));
	lighting += oppositeDiff * ambient;
	return lighting;
	}
	
	float CalcShadow(vec4 lightSpaceFragPos, vec3 normal) {
	// perform perspective divide
	vec3 projCoords = lightSpaceFragPos.xyz / lightSpaceFragPos.w;
	
	// transform to [0,1] range
	projCoords = projCoords * 0.5 + 0.5;
	
	if (projCoords.z > 1.0) {
		return 0.0;
	}
	
	// get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
	float closestDepth = texture(depthMap, projCoords.xy).r; 
	
	// get depth of current fragment from light's perspective
	float currentDepth = projCoords.z;
	
	// check whether current frag pos is in shadow
	float bias = -max(0.001 * (1.0 - dot(normal, directionalLight.direction)), 0.002);
	// float bias = 0.0;
	
	float shadow = 0.0;
	ivec2 textureSize = textureSize(depthMap, 0);
	vec2 texelSize = vec2(1.0 / float(textureSize.x), 1.0 / float(textureSize.y));
	for(int x = -1; x <= 1; ++x)
	{
		for(int y = -1; y <= 1; ++y)
		{
			float pcfDepth = texture(depthMap, projCoords.xy + vec2(x, y) * texelSize).r; 
			shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
		}    
	}
	shadow = shadow / 9.0;
	
	return shadow;
	}
	
	// Calculates the colour when using a point light.
	vec3 CalcPointLight(PointLight light, vec3 normal, vec3 fragPos, vec3 cameraDir, vec3 diffuse, float specular, float shininess) {
	if (light.pointDepthMapIndex >= 0 && light.pointDepthMapIndex < ` +
    pointShadowsToAllocate +
    ` && CalcPointShadow(fragPos, light) == 1.0) {
		return vec3(0.0, 0.0, 0.0);
	} 
	
	vec3 lightDir = normalize(light.position - fragPos); //light direction from the fragment position
	
	// Diffuse shading
	float diff = max(dot(normal, lightDir), 0.0);
	
	// Specular shading
	vec3 reflectDir = reflect(-lightDir, normal);
	float spec = pow(max(dot(cameraDir, reflectDir), 0.0), shininess);
	
	// Attenuation
	float distance = length(light.position - fragPos);
	float attenuation = 1.0f / (light.constant + light.linear * distance + light.quadratic * (distance * distance));
	
	// Combine results
	vec3 finalDiffuse = light.colour * diff * diffuse;
	vec3 finalSpecular = light.colour * spec * specular;
	finalDiffuse *= attenuation;
	finalSpecular *= attenuation;
	return finalDiffuse + finalSpecular;
	}
	
	const float far_plane = 100.0;
	
	float CalcPointShadow(vec3 fragPos, PointLight light) {
	// get vector between fragment position and light position
	vec3 fragToLight = fragPos - light.position;
	fragToLight.y *= -1.0;
	fragToLight.z *= -1.0;
	// use the light to fragment vector to sample from the depth map
	float closestDepth = 1.0;`;
  // Below is ugly, but I have to unroll the loop to be able to acces the pointDepthMaps array with a compile time index, as run-time index is not allowed to access a sampler
  for (let i = 0; i < pointShadowsToAllocate; i++) {
    if (i == 0) {
      lightingFragmentShaderSrc +=
        `
	if (light.pointDepthMapIndex == ` +
        i +
        `) {
		closestDepth = texture(pointDepthMaps[` +
        i +
        `], fragToLight).r;
	}
	`;
    } else {
      lightingFragmentShaderSrc +=
        `
	else if (light.pointDepthMapIndex == ` +
        i +
        `) {
		closestDepth = texture(pointDepthMaps[` +
        i +
        `], fragToLight).r;
	}
	`;
    }
  }

  lightingFragmentShaderSrc += `
	// it is currently in linear range between [0,1]. Re-transform back to original value
	closestDepth *= far_plane;
	// now get current linear depth as the length between the fragment and light position
	float currentDepth = length(fragToLight);
	// now test for shadows
	float bias = 0.05;
	float shadow = currentDepth -  bias > closestDepth ? 1.0 : 0.0;
	
	return shadow;
	}
	`;

  return lightingFragmentShaderSrc;
}

export default class LightingPassShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(gl, "LightingPass", screenQuadVertexSrc, getFragSrc());

    this.use();
  }
}
