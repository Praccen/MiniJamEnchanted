import { Camera, Scene, vec2, vec3 } from "praccen-web-engine";
import ProceduralAnimationObject from "./ProceduralAnimations/ProceduralAnimationObject.js";
import { Input } from "../Input.js";

export default class Player {
  proceduralAnimationModel: ProceduralAnimationObject;

  constructor(scene: Scene, startPos: vec3) {
    this.proceduralAnimationModel = new ProceduralAnimationObject(
      scene,
      startPos
    );
  }

  update(camera: Camera, dt: number) {
    let accVec = vec3.create();

    // Movement input
    let forward = vec3.clone(camera.getDir());
    forward[1] = 0.0;
    vec3.normalize(forward, forward);

    let right = vec3.clone(camera.getRight());
    right[1] = 0.0;
    vec3.normalize(right, right);

    // Touch / joystick control
    Input.updateGamepad();
    if (
      vec2.sqrLen(
        vec2.fromValues(
          Input.joystickLeftDirection[0],
          Input.joystickLeftDirection[1]
        )
      ) > 0.001
    ) {
      vec3.scaleAndAdd(
        accVec,
        accVec,
        right,
        Input.joystickLeftDirection[0] * 2.0
      );
      vec3.scaleAndAdd(
        accVec,
        accVec,
        forward,
        -Input.joystickLeftDirection[1] * 2.0
      );
    }
    // Keyboard control
    else {
      if (Input.keys["W"]) {
        vec3.add(accVec, accVec, forward);
      }

      if (Input.keys["S"]) {
        vec3.sub(accVec, accVec, forward);
      }

      if (Input.keys["A"]) {
        vec3.sub(accVec, accVec, right);
      }

      if (Input.keys["D"]) {
        vec3.add(accVec, accVec, right);
      }
    }

    if (vec3.sqrLen(accVec) > 0.001) {
      this.proceduralAnimationModel.headingDirection = accVec;

      let acceleration = vec3.len(accVec);

      // Update camera
      // if (input.keys["ARROWLEFT"]) {
      //   this.cameraFocusComp.offset.add(
      //     new Vec3(this.rendering.camera.getRight()).multiply(dt * 8.0),
      //   );
      // } else if (input.keys["ARROWRIGHT"]) {
      //   this.cameraFocusComp.offset.subtract(
      //     new Vec3(this.rendering.camera.getRight()).multiply(dt * 8.0),
      //   );
      // } else if (this.movComp) {
      //   this.cameraFocusComp.offset.subtract(
      //     new Vec3(this.movComp.velocity).multiply(dt * 3.0),
      //   );
      // }

      // // ---- Keep a good camera distance ----
      // let disiredDistance = 2.0;

      // this.cameraFocusComp.offset.multiply(
      //   Math.pow(disiredDistance / this.cameraFocusComp.offset.len(), 0.1),
      // );
      // this.cameraFocusComp.offset.y = Math.max(
      //   this.cameraFocusComp.offset.y,
      //   1.0,
      // );

      // let offsetXZ = new Vec3([
      //   this.cameraFocusComp.offset.x,
      //   0.0,
      //   this.cameraFocusComp.offset.z,
      // ]);
      // let len2 = offsetXZ.length2();
      // if (len2 < 1.0 && len2 > 0.001) {
      //   offsetXZ.normalize();
      //   this.cameraFocusComp.offset.x = offsetXZ.x;
      //   this.cameraFocusComp.offset.z = offsetXZ.z;
      // }
      // // -------------------------------------

      // // Update drag based on velocity
      // let xzVelocity = new Vec3(this.movComp.velocity);
      // xzVelocity.y = 0.0;
      // this.movComp.drag = 10.0 + xzVelocity.len();
      // if (this.currentAnimation == this.sitAnimation) {
      //   this.movComp.drag *= 2.0;
      // }
    }
  }
}
