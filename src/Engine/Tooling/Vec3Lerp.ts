import { vec3 } from "gl-matrix";

export default class Vec3Lerp {
  private duration: number;

  private start: vec3;
  private diff: vec3;

  private timer: number = 0.0;
  constructor(duration: number, start: vec3, end: vec3) {
    this.reset(duration, start, end);
  }

  reset(duration: number, start: vec3, end: vec3) {
    this.duration = Math.max(duration, 0.00001);
    this.start = vec3.clone(start);
    this.diff = vec3.sub(vec3.create(), end, this.start);
    this.timer = 0.0;
  }

  /**
   *
   * @param dt delta time
   * @param interpolatedOutput output updated in place
   * Returns if the interpolation is done
   */
  update(dt: number, interpolatedOutput: vec3): boolean {
    this.timer += dt;
    vec3.scaleAndAdd(
      interpolatedOutput,
      this.start,
      this.diff,
      Math.min(this.timer, this.duration) / this.duration,
    );
    return this.timer > this.duration;
  }
}
