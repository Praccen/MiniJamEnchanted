import { applicationStartTime, PointLight } from "../../../../Engine.js";
import GraphicsObject from "../GraphicsObjects/GraphicsObject.js";
import Texture from "../../AssetHandling/Textures/Texture.js";
import ShaderProgram from "../../Renderer/ShaderPrograms/ShaderProgram.js";
import { quat, vec3 } from "gl-matrix";

type Modifier = {
  boxMin: vec3;
  boxMax: vec3;
  direction: vec3;
  degreesMin: number;
  degreesMax: number;
  amplitudeMin: number;
  amplitudeMax: number;
  keyframes: vec3[];
};

function getDefaultModifier(): Modifier {
  return {
    boxMin: vec3.create(),
    boxMax: vec3.create(),
    direction: vec3.fromValues(0.0, 1.0, 0.0),
    degreesMin: 0.0,
    degreesMax: 360.0,
    amplitudeMin: 0.0,
    amplitudeMax: 0.0,
    keyframes: [],
  };
}

type OptionalModifier = {
  boxMin?: vec3;
  boxMax?: vec3;
  direction?: vec3;
  degreesMin?: number;
  degreesMax?: number;
  amplitudeMin?: number;
  amplitudeMax?: number;
  keyframes?: vec3[];
};

function applyOptionalModifierOnModifier(
  modifier: Modifier,
  optionalModifier: OptionalModifier,
) {
  modifier.boxMin = optionalModifier.boxMin ?? modifier.boxMin;
  modifier.boxMax = optionalModifier.boxMax ?? modifier.boxMax;
  modifier.direction = optionalModifier.direction ?? modifier.direction;
  modifier.degreesMin = optionalModifier.degreesMin ?? modifier.degreesMin;
  modifier.degreesMax = optionalModifier.degreesMax ?? modifier.degreesMax;
  modifier.amplitudeMin =
    optionalModifier.amplitudeMin ?? modifier.amplitudeMin;
  modifier.amplitudeMax =
    optionalModifier.amplitudeMax ?? modifier.amplitudeMax;
  modifier.keyframes = optionalModifier.keyframes ?? modifier.keyframes;
}

function randomizeBasedOnModifier(
  modifier: Modifier,
  keyframeProgress: number,
): vec3 {
  let returnVector = vec3.create();
  if (modifier.amplitudeMin != 0.0 || modifier.amplitudeMax != 0.0) {
    vec3.transformQuat(
      returnVector,
      modifier.direction,
      quat.setAxisAngle(
        quat.create(),
        vec3.random(vec3.create(), 1.0),
        (Math.PI / 180) *
          (Math.random() * (modifier.degreesMax - modifier.degreesMin) +
            modifier.degreesMin),
      ),
    );

    vec3.scale(
      returnVector,
      returnVector,
      Math.random() * (modifier.amplitudeMax - modifier.amplitudeMin) +
        modifier.amplitudeMin,
    );
  }

  vec3.add(
    returnVector,
    returnVector,
    vec3.fromValues(
      (modifier.boxMax[0] - modifier.boxMin[0]) * Math.random() +
        modifier.boxMin[0],
      (modifier.boxMax[1] - modifier.boxMin[1]) * Math.random() +
        modifier.boxMin[1],
      (modifier.boxMax[2] - modifier.boxMin[2]) * Math.random() +
        modifier.boxMin[2],
    ),
  );

  if (modifier.keyframes.length > 0) {
    let indexProgress =
      (Math.max(0.0, keyframeProgress) % 1.0) * (modifier.keyframes.length - 1);
    let lower = Math.floor(indexProgress);
    let upper = lower + 1;
    let progressBetween = indexProgress - lower;

    if (upper >= modifier.keyframes.length) {
      upper = lower;
    }

    vec3.scaleAndAdd(
      returnVector,
      returnVector,
      modifier.keyframes[lower],
      1.0 - progressBetween,
    );
    vec3.scaleAndAdd(
      returnVector,
      returnVector,
      modifier.keyframes[upper],
      progressBetween,
    );
  }

  return returnVector;
}

export default class ParticleSpawner extends GraphicsObject {
  startTexture: Texture;
  endTexture: Texture;
  fadePerSecond: number = 0.0;
  fadePerSecondSquared: number = 0.0;
  textureChangePerSecond: number = 0.0;
  sizeChangePerSecond: number = 1.0;
  lifeTime: number = 1.0;
  position: vec3 = vec3.create();
  offset: vec3 = vec3.create();
  keyframeDuplicationFactor: number = 1.0;
  attachedPointLight: PointLight = null;

  // Below modifiers are applied when particles respawn in the update function
  private _randomPositionModifier: Modifier = getDefaultModifier(); // Relative to postion + offset
  public get randomPositionModifier(): Modifier {
    return this._randomPositionModifier;
  }
  public set randomPositionModifier(modifier: OptionalModifier) {
    applyOptionalModifierOnModifier(this._randomPositionModifier, modifier);
  }

  private _randomSizeModifier = { sizeMin: 0.1, sizeMax: 0.1 };
  public get randomSizeModifier(): { sizeMin: number; sizeMax: number } {
    return this._randomSizeModifier;
  }
  public set randomSizeModifier(modifier: {
    sizeMin?: number;
    sizeMax?: number;
  }) {
    this._randomSizeModifier.sizeMin =
      modifier.sizeMin ?? this._randomSizeModifier.sizeMin;
    this._randomSizeModifier.sizeMax =
      modifier.sizeMax ?? this._randomSizeModifier.sizeMax;
  }

  private _randomStartVelModifier: Modifier = getDefaultModifier();
  public get randomStartVelModifier(): Modifier {
    return this._randomStartVelModifier;
  }
  public set randomStartVelModifier(modifier: OptionalModifier) {
    applyOptionalModifierOnModifier(this._randomStartVelModifier, modifier);
  }

  private _randomAccelerationModifier: Modifier = getDefaultModifier();
  public get randomAccelerationModifier(): Modifier {
    return this._randomAccelerationModifier;
  }
  public set randomAccelerationModifier(modifier: OptionalModifier) {
    applyOptionalModifierOnModifier(this._randomAccelerationModifier, modifier);
  }

  fadeOut: boolean = false;
  updateOnce: boolean = false;

  // Private
  private numParticles: number = 0;
  private vertices: Float32Array;
  private indices: Int32Array;
  private instanceVBO: WebGLBuffer;
  private resetTimer: number = 0.0;
  private fadeOutTimer = 0.0;

  constructor(
    gl: WebGL2RenderingContext,
    texture: Texture,
    numberOfStartingParticles: number = 0,
  ) {
    super(gl);

    this.startTexture = texture;
    this.endTexture = texture;

    this.bindVAO();
    this.instanceVBO = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      numberOfStartingParticles * 11 * 4,
      this.gl.DYNAMIC_DRAW,
    );
    this.setupInstancedVertexAttributePointers();
    this.unbindVAO();

    // prettier-ignore
    this.vertices = new Float32Array([ 
            // positions  // uv
            -0.5,  0.5,   0.0, 1.0,
            -0.5, -0.5,   0.0, 0.0,
             0.5, -0.5,   1.0, 0.0,
             0.5,  0.5,   1.0, 1.0,
        ]);

    // prettier-ignore
    this.indices = new Int32Array([
            0, 1, 2,
            0, 2, 3,
        ]);
    this.setVertexData(this.vertices);
    this.setIndexData(this.indices);

    // All starting particles are initialized as size and position 0, so they wont be visable unless manually changed
    this.numParticles = numberOfStartingParticles;
  }

  setupVertexAttributePointers(): void {
    // Change if input layout changes in shaders
    const stride = 4 * 4;
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(0);

    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, stride, 2 * 4);
    this.gl.enableVertexAttribArray(1);
  }

  setupInstancedVertexAttributePointers(): void {
    const stride = 11 * 4;
    this.gl.vertexAttribPointer(2, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribDivisor(2, 1);

    this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, stride, 3 * 4);
    this.gl.enableVertexAttribArray(3);
    this.gl.vertexAttribDivisor(3, 1);

    this.gl.vertexAttribPointer(4, 3, this.gl.FLOAT, false, stride, 4 * 4);
    this.gl.enableVertexAttribArray(4);
    this.gl.vertexAttribDivisor(4, 1);

    this.gl.vertexAttribPointer(5, 1, this.gl.FLOAT, false, stride, 7 * 4);
    this.gl.enableVertexAttribArray(5);
    this.gl.vertexAttribDivisor(5, 1);

    this.gl.vertexAttribPointer(6, 3, this.gl.FLOAT, false, stride, 8 * 4);
    this.gl.enableVertexAttribArray(6);
    this.gl.vertexAttribDivisor(6, 1);

    // this.gl.vertexAttribPointer(7, 1, this.gl.FLOAT, false, stride, 11 * 4);
    // this.gl.enableVertexAttribArray(7);
    // this.gl.vertexAttribDivisor(7, 1);
  }

  setNumParticles(amount: number) {
    this.numParticles = amount;

    this.bindVAO();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.numParticles * 11 * 4,
      this.gl.DYNAMIC_DRAW,
    );
    this.unbindVAO();
  }

  /**
   * Usese position, offset and randomModifier variables for initializing the particles
   */
  initAllParticles() {
    const tempFadeOut = this.fadeOut;
    const tempFadeOutTimer = this.fadeOutTimer;

    this.fadeOut = false;

    this.update(this.lifeTime);

    this.fadeOut = tempFadeOut;
    this.fadeOutTimer = tempFadeOutTimer;
  }

  getNumberOfParticles(): number {
    return this.numParticles;
  }

  setParticleData(
    particleIndex: number,
    startPosition: vec3,
    size: number,
    startVel: vec3,
    acceleration: vec3,
    startTime?: number,
  ): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    let time = (Date.now() - applicationStartTime) * 0.001;

    if (startTime != undefined) {
      time = startTime;
    }

    let data = new Float32Array([
      startPosition[0],
      startPosition[1],
      startPosition[2],
      size,
      startVel[0],
      startVel[1],
      startVel[2],
      time,
      acceleration[0],
      acceleration[1],
      acceleration[2],
    ]);

    this.bufferSubDataUpdate(particleIndex * 11, data);

    if (this.attachedPointLight != undefined) {
      this.attachedPointLight.position = startPosition;
    }

    return true;
  }

  setParticleStartPosition(particleIndex: number, position: vec3): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11, new Float32Array(position));
    return true;
  }

  setParticleSize(particleIndex: number, size: number): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 3, new Float32Array([size]));
    return true;
  }

  setParticleStartVelocity(particleIndex: number, vel: vec3): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 4, new Float32Array(vel));
    return true;
  }

  setParticleStartTime(particleIndex: number, time: number): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 7, new Float32Array([time]));
    return true;
  }

  resetParticleStartTime(particleIndex: number): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(
      particleIndex * 11 + 7,
      new Float32Array([(Date.now() - applicationStartTime) * 0.001]),
    );
    return true;
  }

  setParticleAcceleration(particleIndex: number, acc: vec3): boolean {
    if (particleIndex > this.numParticles) {
      return false;
    }
    this.bufferSubDataUpdate(particleIndex * 11 + 8, new Float32Array(acc));
    return true;
  }

  private bufferSubDataUpdate(start: number, data: Float32Array): boolean {
    if (start > this.numParticles * 11) {
      return false;
    }
    this.bindVAO();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, start * 4, data);
    this.unbindVAO();
    return true;
  }

  getNumVertices(): number {
    return this.indices.length;
  }

  /**
   *
   * @param dt delta time
   * @returns if this particle should keep existing
   */
  update(dt: number): boolean {
    if (this.fadeOut) {
      this.fadeOutTimer += dt;
      if (this.fadeOutTimer >= this.lifeTime) {
        return false;
      }
      return true;
    }

    let currentParticle = Math.floor(
      (this.resetTimer / Math.max(this.lifeTime, 0.00001)) *
        this.getNumberOfParticles(),
    );
    this.resetTimer += dt;
    let endParticle = Math.floor(
      (this.resetTimer / Math.max(this.lifeTime, 0.00001)) *
        this.getNumberOfParticles(),
    );

    this.fadeOutTimer = 0.0;

    if (endParticle > this.getNumberOfParticles() && this.updateOnce) {
      endParticle = this.getNumberOfParticles();
      this.fadeOut = true;
    }

    for (currentParticle; currentParticle < endParticle; currentParticle++) {
      const particleIndex = currentParticle % this.getNumberOfParticles();
      const keyframeProgress =
        (particleIndex / this.getNumberOfParticles()) *
        this.keyframeDuplicationFactor;
      this.setParticleData(
        particleIndex,
        vec3.add(
          vec3.create(),
          vec3.add(vec3.create(), this.position, this.offset),
          randomizeBasedOnModifier(
            this.randomPositionModifier,
            keyframeProgress,
          ),
        ),
        (this.randomSizeModifier.sizeMax - this.randomSizeModifier.sizeMin) *
          Math.random() +
          this.randomSizeModifier.sizeMin,
        randomizeBasedOnModifier(this.randomStartVelModifier, keyframeProgress),
        randomizeBasedOnModifier(
          this.randomAccelerationModifier,
          keyframeProgress,
        ),
      );
    }
    while (this.resetTimer > this.lifeTime) {
      this.resetTimer -= this.lifeTime;
    }
    return true;
  }

  draw(shaderProgram: ShaderProgram) {
    this.bindVAO();

    this.startTexture.bind(
      shaderProgram.getTextureIndexFromSamplerUniformName("texture0"),
    );
    this.endTexture.bind(
      shaderProgram.getTextureIndexFromSamplerUniformName("texture1"),
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("fadePerSecond")[0],
      this.fadePerSecond,
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("fadePerSecondSquared")[0],
      this.fadePerSecondSquared,
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("textureChangePerSecond")[0],
      this.textureChangePerSecond,
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("sizeChangePerSecond")[0],
      this.sizeChangePerSecond,
    );
    this.gl.uniform1f(
      shaderProgram.getUniformLocation("lifeTime")[0],
      this.lifeTime,
    );

    this.gl.drawElementsInstanced(
      this.gl.TRIANGLES,
      6,
      this.gl.UNSIGNED_INT,
      0,
      this.getNumberOfParticles(),
    );
    this.unbindVAO();
  }
}
