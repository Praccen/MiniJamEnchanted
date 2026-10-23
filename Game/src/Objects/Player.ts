import {
  Camera,
  PhysicsObject,
  PhysicsScene,
  Scene,
  vec2,
  vec3,
} from "praccen-web-engine";
import ProceduralAnimationObject from "./ProceduralAnimations/ProceduralAnimationObject.js";
import { Input } from "../Input.js";

export default class Player {
  proceduralAnimationModel: ProceduralAnimationObject;
  physicsObject: PhysicsObject;

  constructor(scene: Scene, physicsScene: PhysicsScene, startPos: vec3) {
    this.proceduralAnimationModel = new ProceduralAnimationObject(
      scene,
      startPos,
    );

    this.physicsObject = physicsScene.addNewPhysicsObject(
      this.proceduralAnimationModel.baseJoint.gb.transform,
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
          Input.joystickLeftDirection[1],
        ),
      ) > 0.001
    ) {
      vec3.scaleAndAdd(
        accVec,
        accVec,
        right,
        Input.joystickLeftDirection[0] * 2.0,
      );
      vec3.scaleAndAdd(
        accVec,
        accVec,
        forward,
        -Input.joystickLeftDirection[1] * 2.0,
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
      vec3.scaleAndAdd(
        this.physicsObject.force,
        this.physicsObject.force,
        accVec,
        10.0,
      );

      // Update camera
      let cameraOffset = vec3.sub(
        vec3.create(),
        camera.getPosition(),
        this.proceduralAnimationModel.baseJoint.position,
      );

      if (Input.keys["ARROWLEFT"]) {
        vec3.scaleAndAdd(
          cameraOffset,
          cameraOffset,
          camera.getRight(),
          dt * 8.0,
        );
      } else if (Input.keys["ARROWRIGHT"]) {
        vec3.scaleAndAdd(
          cameraOffset,
          cameraOffset,
          camera.getRight(),
          -dt * 8.0,
        );
      } else {
        vec3.scaleAndAdd(
          cameraOffset,
          cameraOffset,
          this.physicsObject.velocity,
          -dt * 3.0,
        );
      }

      // ---- Keep a good camera distance ----
      let desiredDistance = 4.0;

      vec3.scale(
        cameraOffset,
        cameraOffset,
        Math.pow(desiredDistance / vec3.len(cameraOffset), 0.1),
      );

      cameraOffset[1] = Math.max(cameraOffset[1], 1.0);

      let offsetXZ = vec3.fromValues(cameraOffset[0], 0.0, cameraOffset[2]);
      let len2 = vec3.sqrLen(offsetXZ);
      if (len2 < 1.0 && len2 > 0.001) {
        vec3.normalize(offsetXZ, offsetXZ);
        cameraOffset[0] = offsetXZ[0];
        cameraOffset[2] = offsetXZ[2];
      }
      // -------------------------------------

      // Update drag based on velocity
      let xzVelocity = vec3.clone(this.physicsObject.velocity);
      xzVelocity[1] = 0.0;
      this.physicsObject.drag = 1.0 + vec3.len(xzVelocity);
    }
  }

  preRenderingUpdate(dt: number) {
    this.proceduralAnimationModel.baseJoint.position =
      this.physicsObject.transform.position;
    this.proceduralAnimationModel.animate(dt);
  }
}
