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

const sensitivity = 0.3;

export default class Player {
  proceduralAnimationModel: ProceduralAnimationObject;
  physicsObject: PhysicsObject;

  private pitch: number = 0;
  private jaw: number = 0;

  constructor(scene: Scene, physicsScene: PhysicsScene, startPos: vec3) {
    this.proceduralAnimationModel = new ProceduralAnimationObject(
      scene,
      startPos,
    );

    this.physicsObject = physicsScene.addNewPhysicsObject(
      this.proceduralAnimationModel.baseJoint.gb.transform,
    );

    this.proceduralAnimationModel.setupBoundingBox(this.physicsObject);
  }

  update(camera: Camera, dt: number) {
    if (Input.mouseClicked && !document.pointerLockElement) {
      document.body.requestPointerLock();
      console.log("pointer lock");
    }

    // Rotate camera with mouse click and drag
    let mouseDiff = Input.getMouseMovement();

    if (document.pointerLockElement == document.body) {
      // Make sure the user is not changing a slider
      this.pitch -= mouseDiff[1] * sensitivity;
      this.jaw -= mouseDiff[0] * sensitivity;
    }

    this.pitch = Math.max(Math.min(this.pitch, 73), -73); // Don't allow the camera to go past 89 degrees
    this.jaw = this.jaw % 360;

    camera.setPitchJawDegrees(this.pitch, this.jaw); // Update the rotation of the camera

    this.proceduralAnimationModel.headingDirection = vec3.clone(
      camera.getDir(),
    );

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
      vec3.normalize(accVec, accVec);
      vec3.scaleAndAdd(
        this.physicsObject.force,
        this.physicsObject.force,
        accVec,
        10.0,
      );
    }

    if (Input.keys[" "] || Input.buttons["A"]) {
      if (this.physicsObject.onGround) {
        this.physicsObject.impulse[1] += 4.0;
      }
    }

    let cameraDistance = 2.0;
    cameraDistance += vec3.len(this.physicsObject.velocity) * 0.5;
    cameraDistance -= Math.abs(this.pitch) * (cameraDistance / 90);

    // Update camera
    let cameraOffset = vec3.scale(
      vec3.create(),
      camera.getDir(),
      -cameraDistance,
    );

    vec3.scaleAndAdd(
      cameraOffset,
      cameraOffset,
      camera.getRight(),
      1.0 - Math.min(cameraDistance, 0.8),
    );

    // cameraOffset[1] += 1.0;

    cameraOffset[1] = Math.max(-0.2, cameraOffset[1]);

    camera.setPosition(
      vec3.add(
        vec3.create(),
        this.proceduralAnimationModel.baseJoint.position,
        cameraOffset,
      ),
    );
    // -------------------------------------

    // Update drag based on velocity
    let xzVelocity = vec3.clone(this.physicsObject.velocity);
    xzVelocity[1] = 0.0;
    this.physicsObject.drag = 1.0 + vec3.len(xzVelocity);
  }

  preRenderingUpdate(dt: number) {
    // this.proceduralAnimationModel.baseJoint.position = vec3.clone(
    //   this.physicsObject.transform.position,
    // );
    this.proceduralAnimationModel.animate(dt);
  }
}
