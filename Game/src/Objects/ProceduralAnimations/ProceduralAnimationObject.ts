import {
  GraphicsBundle,
  mat3,
  quat,
  Scene,
  Transform,
  vec3,
} from "praccen-web-engine";
import { HumanoidBuildLog } from "./Humanoid.js";
import { CatBuildLog } from "./Cat.js";

enum ConstraintType {
  DISTANCE,
  ROTATION,
  EXCLUSIVE_FLERP,
}

enum ResolutionType {
  SNAP,
  FLIP,
  FLERP,
}

interface BaseConstraint {
  type: ConstraintType;
}

interface DistanceConstraint extends BaseConstraint {
  type: ConstraintType.DISTANCE;
  payload: {
    max?: number;
    min?: number;
    fixed?: number;
  };
}

interface RotationConstraint extends BaseConstraint {
  type: ConstraintType.ROTATION;
  payload: {
    global: boolean;
    axis: vec3;
    resolutionType: ResolutionType;
    angleMin?: number;
    angleMax?: number;
    angleFixed?: number;
    slerp?: {
      start: quat;
      end: quat;
      progress: number;
      speed: number;
    };
  };
}

interface ExclusiveFlerpConstraint extends BaseConstraint {
  type: ConstraintType.EXCLUSIVE_FLERP;
  payload: {
    compareTo: Coupling[];
  };
}

type Constraint =
  | DistanceConstraint
  | RotationConstraint
  | ExclusiveFlerpConstraint;

type Coupling = {
  constraints: Constraint[];
  joint: Joint;
};

type Joint = {
  position: vec3;
  children: Coupling[];
  gb: GraphicsBundle;
};

type SkeletonParameters = {
  headThickness: number;
  headLength: number;
  headColour: string;
  bodySegments: number; // Including head
  bodySegmentLength: number;
  bodySegmentThickness: number;
  bodySegmentFlexibility: number;
  segmentsWithLimbs: number[];
  bodyColour: string;
  limbSegmentLength: number; // Legs are hardcoded as two segments currently
  limbThickness: number;
  limbColour: string;
};

let worm: SkeletonParameters = {
  headThickness: 0.9,
  headLength: 0.9,
  headColour: "CSS:rgb(0,0,0)",
  bodySegments: 4,
  bodySegmentLength: 0.5,
  bodySegmentThickness: 0.6,
  bodySegmentFlexibility: 50,
  segmentsWithLimbs: [0, 1, 2],
  bodyColour: "CSS:rgb(44, 4, 4)",
  limbSegmentLength: 1.4,
  limbThickness: 0.3,
  limbColour: "CSS:rgb(52, 27, 72)",
};

let humanoidParameters: SkeletonParameters = {
  headThickness: 0.4,
  headLength: 0.4,
  headColour: "CSS:rgb(193, 161, 112)",
  bodySegments: 2,
  bodySegmentLength: 0.8,
  bodySegmentThickness: 0.4,
  bodySegmentFlexibility: 15,
  segmentsWithLimbs: [0, 1],
  bodyColour: "CSS:rgb(33, 79, 50)",
  limbSegmentLength: 0.6,
  limbThickness: 0.12,
  limbColour: "CSS:rgb(105, 79, 127)",
};

export default class ProceduralAnimationObject {
  baseJoint: Joint = null;
  baseRotation: quat = quat.create();
  headingDirection: vec3 = vec3.fromValues(1.0, 0.0, 0.0);
  private prevHeading: vec3 = vec3.fromValues(1.0, 0.0, 0.0);
  upDirection: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
  localForward: vec3 = vec3.fromValues(1.0, 0.0, 0.0);
  forwardAdjustment: quat = quat.fromEuler(quat.create(), 0.0, -90, 0.0);

  constructor(scene: Scene, startPos: vec3) {
    // this.buildSkeleton(startPos, scene, worm);
    // this.buildSkeletonFromLog(startPos, scene, HumanoidBuildLog, 2.0);
    this.buildSkeletonFromLog(startPos, scene, CatBuildLog, 4.0);
    this.normalizeRotationAxes(this.baseJoint);
  }

  private buildSkeletonFromLog(
    startPos: vec3,
    scene: Scene,
    log: string,
    scale: number
  ) {
    let forward = vec3.fromValues(1.0, 0.0, 0.0);
    let colour = "CSS:rgb(255,0,0)";
    let joints = new Map<string, Coupling>();
    let currentParent: Joint = null;
    let length = 1.0;
    let width = 1.0;
    let degrees = 360.0;
    let resolution = ResolutionType.SNAP;
    let axis = vec3.fromValues(-1.0, 0.0, 0.0);

    for (let line of log.split("\n")) {
      line = line.trim();
      if (line.length == 0 || line.startsWith("//")) {
        // Empty or comment, don't care about this line
        continue;
      }

      if (line.endsWith("break")) {
        debugger;
      }

      if (line.startsWith("make")) {
        if (joints.size == 0) {
          this.baseJoint = {
            position: startPos,
            gb: scene.addNewMesh(
              "Assets/objs/cube.obj",
              colour,
              "CSS:rgb(0, 0, 0)"
            ),
            children: [],
          };

          vec3.set(
            this.baseJoint.gb.transform.scale,
            0.1 * scale,
            0.1 * scale,
            0.1 * scale
          );
          vec3.set(
            this.baseJoint.gb.transform.scale,
            length * scale,
            width * scale,
            width * scale
          );
          vec3.scale(this.baseJoint.gb.transform.origin, forward, -0.5);

          joints.set(line.split(/\s+/)[1] ?? "base", {
            joint: this.baseJoint,
            constraints: [],
          });
        } else {
          let index =
            currentParent.children.push({
              constraints: [
                {
                  type: ConstraintType.DISTANCE,
                  payload: {
                    fixed: length * scale,
                  },
                },
                {
                  type: ConstraintType.ROTATION,
                  payload: {
                    global: false,
                    axis: axis,
                    angleMax: (degrees * Math.PI) / 180,
                    resolutionType: resolution,
                  },
                },
              ],
              joint: {
                position: vec3.create(),
                gb: scene.addNewMesh(
                  "Assets/objs/cube.obj",
                  colour,
                  "CSS:rgb(0, 0, 0)"
                ),
                children: [],
              },
            }) - 1;

          vec3.set(
            currentParent.children[index].joint.gb.transform.scale,
            length * scale,
            width * scale,
            width * scale
          );
          vec3.set(
            currentParent.children[index].joint.gb.transform.origin,
            -0.5,
            0.0,
            0.0
          );

          joints.set(line.split(/\s+/)[1] ?? "", currentParent.children[index]);
        }
      } else if (line.startsWith("parent")) {
        currentParent =
          joints.get(line.split(/\s+/)[1] ?? "base")?.joint ?? this.baseJoint;
      } else if (line.startsWith("exflerp")) {
        let parts = line.split(/\s+/);
        parts.splice(0, 1); // Remove command
        for (let i = 0; i < parts.length; i++) {
          const part1 = parts[i];
          let otherCouplings: Coupling[] = [];
          for (let j = 0; j < parts.length; j++) {
            if (i === j) {
              continue;
            }
            const part2 = parts[j];
            if (joints.has(part2)) {
              otherCouplings.push(joints.get(part2));
            }
          }
          joints.get(part1)?.constraints.push({
            type: ConstraintType.EXCLUSIVE_FLERP,
            payload: {
              compareTo: otherCouplings,
            },
          });
        }
      } else {
        const command = line.split("=")[0].trim();
        const arg = line.split("=")[1]?.trim();

        switch (command) {
          case "forward": {
            const coords = arg
              .split(",")
              .map((value) => parseFloat(value.trim()));
            if (coords.length < 3) {
              console.warn(
                "Not enough values for command in animation build log: " +
                  command +
                  " " +
                  arg
              );
              break;
            }
            vec3.set(forward, coords[0], coords[1], coords[2]);
            break;
          }
          case "colour":
            colour = arg;
            break;
          case "width":
            width = parseFloat(arg);
            break;
          case "length":
            length = parseFloat(arg);
            break;
          case "axis": {
            const coords = arg
              .split(",")
              .map((value) => parseFloat(value.trim()));
            if (coords.length < 3) {
              console.warn(
                "Not enough values for command in animation build log: " +
                  command +
                  " " +
                  arg
              );
              break;
            }
            axis = vec3.fromValues(coords[0], coords[1], coords[2]);
            break;
          }
          case "degrees":
            degrees = parseFloat(arg);
            break;
          case "resolution":
            if (arg == "snap") {
              resolution = ResolutionType.SNAP;
            } else if (arg == "flip") {
              resolution = ResolutionType.FLIP;
            } else if (arg == "flerp") {
              resolution = ResolutionType.FLERP;
            }
            break;
          default:
            console.warn(
              "Unsupported command in procedural animation build log: " +
                command
            );
            break;
        }
      }
    }

    this.localForward = forward;
    quat.rotationTo(
      this.forwardAdjustment,
      vec3.fromValues(0.0, 0.0, 1.0),
      this.localForward
    );
  }

  private buildSkeleton(
    startPos: vec3,
    scene: Scene,
    parameters: SkeletonParameters
  ) {
    this.baseJoint = {
      position: startPos,
      gb: scene.addNewMesh(
        "Assets/objs/cube.obj",
        parameters.headColour,
        "CSS:rgb(0, 0, 0)"
      ),
      children: [],
    };

    vec3.set(
      this.baseJoint.gb.transform.scale,
      parameters.headLength,
      parameters.headThickness,
      parameters.headThickness
    );
    vec3.set(this.baseJoint.gb.transform.origin, -0.5, 0.0, 0.0);

    let counter = 1;
    let joint = this.baseJoint;
    while (counter < parameters.bodySegments) {
      if (
        parameters.segmentsWithLimbs.findIndex(
          (value) => value == counter - 1
        ) >= 0
      ) {
        this.addLimbs(
          joint,
          scene,
          parameters.limbSegmentLength,
          parameters.limbThickness,
          1.0 - (2.0 / parameters.bodySegments) * counter,
          parameters.limbColour
        );
      }

      let index =
        joint.children.push({
          constraints: [
            {
              type: ConstraintType.DISTANCE,
              payload: {
                max: parameters.bodySegmentLength,
                min:
                  parameters.bodySegmentLength -
                  (parameters.bodySegmentLength / parameters.bodySegments) *
                    (counter - 1),
              },
            },
            {
              type: ConstraintType.ROTATION,
              payload: {
                global: false,
                axis: vec3.fromValues(-1.0, 0.0, 0.0),
                angleMax: parameters.bodySegmentFlexibility * (Math.PI / 180),
                resolutionType: ResolutionType.SNAP,
              },
            },
          ],
          joint: {
            position: vec3.create(),
            gb: scene.addNewMesh(
              "Assets/objs/cube.obj",
              parameters.bodyColour,
              "CSS:rgb(0, 0, 0)"
            ),
            children: [],
          },
        }) - 1;

      vec3.set(
        joint.children[index].joint.gb.transform.scale,
        parameters.bodySegmentLength,
        parameters.bodySegmentThickness,
        parameters.bodySegmentThickness
      );
      vec3.set(joint.children[index].joint.gb.transform.origin, -0.5, 0.0, 0.0);

      joint = joint.children[index].joint;
      counter++;
    }

    if (
      parameters.segmentsWithLimbs.findIndex((value) => value == counter - 1) >=
      0
    ) {
      this.addLimbs(
        joint,
        scene,
        parameters.limbSegmentLength,
        parameters.limbThickness,
        1.0 - (2.0 / parameters.bodySegments) * counter,
        parameters.limbColour
      );
    }
  }

  private addLimbs(
    joint: Joint,
    scene: Scene,
    legLength: number,
    thickness: number,
    forwardInfluence: number,
    legsColour: string
  ) {
    joint.children.push({
      constraints: [
        {
          type: ConstraintType.DISTANCE,
          payload: { max: legLength, min: legLength * 0.9 },
        },
        {
          type: ConstraintType.ROTATION,
          payload: {
            global: false,
            axis: vec3.fromValues(forwardInfluence, 0.2, 1.0),
            angleMax: 45 * (Math.PI / 180),
            resolutionType: ResolutionType.FLERP,
          },
        },
      ],
      joint: {
        position: vec3.create(),
        gb: scene.addNewMesh(
          "Assets/objs/cube.obj",
          legsColour,
          "CSS:rgb(0, 0, 0)"
        ),
        children: [
          {
            constraints: [
              {
                type: ConstraintType.DISTANCE,
                payload: { max: legLength, min: legLength * 0.9 },
              },
              {
                type: ConstraintType.ROTATION,
                payload: {
                  global: false,
                  axis: vec3.fromValues(forwardInfluence, -1.0, 1.0),
                  angleFixed: 0 * (Math.PI / 180),
                  resolutionType: ResolutionType.SNAP,
                },
              },
            ],
            joint: {
              position: vec3.create(),
              gb: scene.addNewMesh(
                "Assets/objs/cube.obj",
                legsColour,
                "CSS:rgb(0, 0, 0)"
              ),
              children: [],
            },
          },
        ],
      },
    });
    joint.children.push({
      constraints: [
        {
          type: ConstraintType.DISTANCE,
          payload: { max: legLength, min: legLength * 0.9 },
        },
        {
          type: ConstraintType.ROTATION,
          payload: {
            global: false,
            axis: vec3.fromValues(forwardInfluence, 0.2, -1.0),
            angleMax: 45 * (Math.PI / 180),
            resolutionType: ResolutionType.FLERP,
          },
        },
      ],
      joint: {
        position: vec3.create(),
        gb: scene.addNewMesh(
          "Assets/objs/cube.obj",
          legsColour,
          "CSS:rgb(0, 0, 0)"
        ),
        children: [
          {
            constraints: [
              {
                type: ConstraintType.DISTANCE,
                payload: { max: legLength, min: legLength * 0.9 },
              },
              {
                type: ConstraintType.ROTATION,
                payload: {
                  global: false,
                  axis: vec3.fromValues(forwardInfluence, -1.0, -1.0),
                  angleFixed: 0 * (Math.PI / 180),
                  resolutionType: ResolutionType.SNAP,
                },
              },
            ],
            joint: {
              position: vec3.create(),
              gb: scene.addNewMesh(
                "Assets/objs/cube.obj",
                legsColour,
                "CSS:rgb(0, 0, 0)"
              ),
              children: [],
            },
          },
        ],
      },
    });

    vec3.set(
      joint.children[0].joint.gb.transform.scale,
      legLength,
      thickness,
      thickness
    );
    vec3.set(joint.children[0].joint.gb.transform.origin, -0.5, 0.0, 0.0);
    vec3.set(
      joint.children[0].joint.children[0].joint.gb.transform.scale,
      legLength,
      thickness,
      thickness
    );
    vec3.set(
      joint.children[0].joint.children[0].joint.gb.transform.origin,
      -0.5,
      0.0,
      0.0
    );

    vec3.set(
      joint.children[1].joint.gb.transform.scale,
      legLength,
      thickness,
      thickness
    );
    vec3.set(joint.children[1].joint.gb.transform.origin, -0.5, 0.0, 0.0);
    vec3.set(
      joint.children[1].joint.children[0].joint.gb.transform.scale,
      legLength,
      thickness,
      thickness
    );
    vec3.set(
      joint.children[1].joint.children[0].joint.gb.transform.origin,
      -0.5,
      0.0,
      0.0
    );

    joint.children[0].constraints.push({
      type: ConstraintType.EXCLUSIVE_FLERP,
      payload: { compareTo: [joint.children[1]] },
    });
    joint.children[1].constraints.push({
      type: ConstraintType.EXCLUSIVE_FLERP,
      payload: { compareTo: [joint.children[0]] },
    });
  }

  private normalizeRotationAxes(joint: Joint) {
    for (const child of joint.children) {
      for (const constraint of child.constraints) {
        if (constraint.type == ConstraintType.ROTATION) {
          vec3.normalize(constraint.payload.axis, constraint.payload.axis);
        }
      }
      this.normalizeRotationAxes(child.joint);
    }
  }

  private getRotationWithUp(targetDir: vec3, upDir: vec3) {
    let up = vec3.normalize(vec3.create(), upDir);

    let right = vec3.cross(vec3.create(), up, targetDir);
    vec3.normalize(right, right);

    let forward = vec3.cross(vec3.create(), right, up);
    vec3.normalize(forward, forward);

    let rotationMatrix = mat3.fromValues(
      right[0],
      right[1],
      right[2],
      up[0],
      up[1],
      up[2],
      forward[0],
      forward[1],
      forward[2]
    );

    let outQuat = quat.fromMat3(quat.create(), rotationMatrix);
    quat.normalize(outQuat, outQuat);

    quat.mul(outQuat, outQuat, this.forwardAdjustment);

    return outQuat;
  }

  animate(dt: number) {
    /*
        ---- Delta rotation, can have anything as "up" but                    ----
        ---- might introduce drifting where up on flat                        ----
        ---- ground is no longer y-axis. In case this happens                 ----
        ---- we should add an influence to move towards ground up for example ----
        */
    // let rotationQuat = quat.rotationTo(quat.create(), this.prevHeading, this.headingDirection);
    // quat.normalize(rotationQuat, rotationQuat);
    // quat.mul(this.baseRotation, rotationQuat, this.baseRotation);
    // quat.normalize(this.baseRotation, this.baseRotation);
    // vec3.copy(this.prevHeading, this.headingDirection);
    // --------------------------------------------------------------------------

    // ---- Global y-up, no drifting problems ----
    // const angle = Math.atan2(this.headingDirection[0], this.headingDirection[2]) - Math.PI / 2.0;
    // quat.rotateY(this.baseRotation, quat.create(), angle);
    // -------------------------------------------

    // ---- Configurable up, no drifting problems, use environment normal as up for climbing ----
    this.baseRotation = this.getRotationWithUp(
      this.headingDirection,
      this.upDirection
    );
    //-------------------------------------------------------------------------------------------

    this.baseJoint.gb.transform.rotation = this.baseRotation;
    this.animateRecursive(this.baseJoint, this.baseRotation, dt);
  }

  private animateRecursive(joint: Joint, prevRotation: quat, dt: number) {
    joint.gb.transform.position = joint.position;
    for (const childJoint of joint.children) {
      let offsetDir = vec3.sub(
        vec3.create(),
        childJoint.joint.position,
        joint.position
      );
      let currDist = vec3.len(offsetDir);
      if (currDist > 0.0001) {
        vec3.normalize(offsetDir, offsetDir);
      } else {
        offsetDir = vec3.random(offsetDir, 1.0);
      }

      let rotation = quat.clone(prevRotation);
      let tempAxis = null;

      for (const constraint of childJoint.constraints) {
        switch (constraint.type) {
          case ConstraintType.DISTANCE:
            if (constraint.payload.fixed != undefined) {
              currDist = constraint.payload.fixed;
            } else {
              if (constraint.payload.min != undefined) {
                currDist = Math.max(constraint.payload.min, currDist);
              }
              if (constraint.payload.max != undefined) {
                currDist = Math.min(constraint.payload.max, currDist);
              }
            }

            childJoint.joint.position = vec3.scaleAndAdd(
              vec3.create(),
              joint.position,
              offsetDir,
              currDist
            );

            break;
          case ConstraintType.ROTATION:
            let rotationQuat = quat.create();
            tempAxis = constraint.payload.axis;
            const transformedAxis = constraint.payload.global
              ? constraint.payload.axis
              : vec3.transformQuat(
                  vec3.create(),
                  constraint.payload.axis,
                  prevRotation
                );

            if (constraint.payload.slerp != undefined) {
              constraint.payload.slerp.progress +=
                dt * constraint.payload.slerp.speed;

              quat.slerp(
                rotationQuat,
                constraint.payload.slerp.start,
                constraint.payload.slerp.end,
                Math.min(constraint.payload.slerp.progress, 1.0)
              );

              if (constraint.payload.slerp.progress >= 1.0) {
                delete constraint.payload.slerp;
              }
            } else {
              let angle = vec3.angle(offsetDir, transformedAxis);
              let crossAxis = vec3.cross(
                vec3.create(),
                transformedAxis,
                offsetDir
              );
              vec3.normalize(crossAxis, crossAxis);

              if (constraint.payload.angleFixed != undefined) {
                angle = constraint.payload.angleFixed;
              } else {
                if (constraint.payload.angleMin != undefined) {
                  angle = Math.max(angle, constraint.payload.angleMin);
                }

                if (
                  constraint.payload.angleMax != undefined &&
                  angle > constraint.payload.angleMax
                ) {
                  switch (constraint.payload.resolutionType) {
                    case ResolutionType.SNAP:
                      angle = Math.min(angle, constraint.payload.angleMax);
                      break;
                    case ResolutionType.FLIP:
                      // vec3.scale(crossAxis, crossAxis, -1.0);
                      angle = -constraint.payload.angleMax * 0.97;
                      break;
                    case ResolutionType.FLERP:
                      let exFlerp = childJoint.constraints.find(
                        (value) => value.type == ConstraintType.EXCLUSIVE_FLERP
                      );
                      let startSlerp = true;

                      if (exFlerp) {
                        for (const compareJoint of exFlerp.payload.compareTo) {
                          const otherRotConstraint =
                            compareJoint.constraints.find(
                              (value) => value.type == ConstraintType.ROTATION
                            );
                          if (
                            otherRotConstraint?.payload.slerp?.progress <
                            1.0 - otherRotConstraint?.payload.slerp?.speed * dt
                          ) {
                            // Some other joint that is exclusive is slerping and won't finish this update, do not start this slerp.
                            startSlerp = false;
                            break;
                          }
                        }
                      }

                      if (startSlerp) {
                        constraint.payload.slerp = {
                          start: quat.setAxisAngle(
                            quat.create(),
                            crossAxis,
                            angle
                          ),
                          end: quat.setAxisAngle(
                            quat.create(),
                            crossAxis,
                            -constraint.payload.angleMax * 0.97
                          ),
                          progress: 0.0,
                          speed: 3.0,
                        };
                      }
                      break;
                    default:
                      break;
                  }
                }
              }

              quat.setAxisAngle(rotationQuat, crossAxis, angle);
            }

            vec3.transformQuat(offsetDir, transformedAxis, rotationQuat);
            childJoint.joint.position = vec3.scaleAndAdd(
              vec3.create(),
              joint.position,
              offsetDir,
              currDist
            );
            quat.mul(rotation, rotationQuat, rotation);
            quat.normalize(rotation, rotation);
            break;
          default:
            break;
        }
      }

      if (tempAxis) {
        quat.rotationTo(
          childJoint.joint.gb.transform.rotation,
          vec3.fromValues(-1.0, 0.0, 0.0),
          tempAxis
        );
      } else {
        quat.identity(childJoint.joint.gb.transform.rotation);
      }

      quat.mul(
        childJoint.joint.gb.transform.rotation,
        rotation,
        childJoint.joint.gb.transform.rotation
      );
      this.animateRecursive(childJoint.joint, rotation, dt);
    }
  }
}
