import ShaderProgram from "../ShaderProgram.js";

const particleVertexShaderSrc: string = `#version 300 es

layout (location = 0) in vec2 inVertexPosition;
layout (location = 1) in vec2 inTexCoords;

// Instanced attributes starts here
layout (location = 2) in vec3 inStartPosition;
layout (location = 3) in float inSize;
layout (location = 4) in vec3 inStartVel;
layout (location = 5) in float inStartTime;
layout (location = 6) in vec3 inConstantAcceleration;
// layout (location = 7) in float padding;

uniform mat4 viewProjMatrix;
uniform vec3 cameraPos;
uniform float currentTime;
uniform float fadePerSecond;
uniform float fadePerSecondSquared;
uniform float sizeChangePerSecond;
uniform float textureChangePerSecond;
uniform float lifeTime;

out vec2 texCoords;
out float alpha;
out float textureChange;

vec3 calculatePosition(float time) {
  return inStartPosition + (inStartVel * time + (inConstantAcceleration * time) * time) / 2.0;
}

void main() {
    // Calculate how long this has been alive
    float currentLifeTime = currentTime - inStartTime;

    // Calculate current position
    vec3 currentPos = calculatePosition(currentLifeTime);
    
    // Billboarding
    vec3 camDir = cameraPos - currentPos;
    vec3 rightVec = normalize(cross(vec3(0.0, 1.0, 0.0), camDir));
    vec3 upVec = normalize(cross(camDir, rightVec));
    rightVec = rightVec * inVertexPosition.x * (inSize + sizeChangePerSecond * currentLifeTime);
    upVec = upVec * inVertexPosition.y * (inSize + sizeChangePerSecond * currentLifeTime);
    gl_Position = viewProjMatrix * vec4(rightVec + upVec + currentPos, 1.0);

    // gl_Position = viewProjMatrix * vec4(vec3(inVertexPosition, 0.0) * inSize + currentPos, 1.0); // No billboarding
    texCoords = inTexCoords;
    alpha = max(1.0 - currentLifeTime * fadePerSecond, 0.0);
    alpha = max(alpha - currentLifeTime * currentLifeTime * fadePerSecondSquared, 0.0);
    if (currentLifeTime > lifeTime) {
      alpha = 0.0;
    }
    textureChange = min(currentLifeTime * textureChangePerSecond, 1.0);
}`;

const particleFragmentShaderSrc: string = `#version 300 es
precision highp float;

in vec2 texCoords;
in float alpha;
in float textureChange;

uniform sampler2D texture0;
uniform sampler2D texture1;

layout (location = 0) out vec4 FragColor;
layout (location = 1) out float FragOpacity;

mat4 thresholdMatrix = mat4(
    1.0, 9.0, 3.0, 11.0,
    13.0, 5.0, 15.0, 7.0,
    4.0, 12.0, 2.0, 10.0,
    16.0, 8.0, 14.0, 6.0
    );

void main()
{
    FragColor = texture(texture0, texCoords) * (1.0 - textureChange) + texture(texture1, texCoords) * textureChange;

    FragColor.a = FragColor.a * alpha;
    
    float threshold = thresholdMatrix[int(floor(mod(gl_FragCoord.x, 4.0)))][int(floor(mod(gl_FragCoord.y, 4.0)))] / 17.0;
    if (threshold >= FragColor.a) {
        discard;
    }

  FragOpacity = 1.0;
  FragColor.a = 1.0; // Since we use screen door transparency, do not use alpha value
}`;

export default class ParticleShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "ParticleShaderProgram",
      particleVertexShaderSrc,
      particleFragmentShaderSrc,
      false,
    );

    this.use();
  }
}
