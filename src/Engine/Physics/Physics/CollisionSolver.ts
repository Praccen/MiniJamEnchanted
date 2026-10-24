import { mat4, quat, vec3 } from "gl-matrix";
import { IntersectionTester } from "./IntersectionTester.js";
import PhysicsObject from "./Objects/PhysicsObject.js";
import { collisionPointVisualizer } from "../../Tooling/WorldEditor.js";

const skin_width = 0.02;

export namespace CollisionSolver {
  export function getTranslationNeeded(
    intersectionInformation: Array<IntersectionTester.IntersectionInformation>,
  ): vec3 {
    if (intersectionInformation.length == 0) {
      return vec3.create();
    }

    let final_mtv = vec3.fromValues(0, 0, 0);
    let max_depth = 0;

    for (let inf of intersectionInformation) {
      if (inf.depth < skin_width) {
        continue;
      }
      const depth = inf.depth - skin_width;

      if (depth > max_depth) {
        max_depth = depth;
      }
      vec3.scaleAndAdd(
        final_mtv,
        final_mtv,
        vec3.normalize(vec3.create(), inf.axis),
        depth,
      );
    }

    if (vec3.length(final_mtv) > 0) {
      vec3.scale(final_mtv, vec3.normalize(final_mtv, final_mtv), max_depth);
    }

    return final_mtv;
  }

  function getInverseMass(object: PhysicsObject): number {
    if (object.isStatic || object.isImmovable || object.mass <= 0) {
      return 0;
    }

    return 1 / object.mass;
  }

  function getWorldMassCenter(object: PhysicsObject): vec3 {
    return vec3.transformMat4(
      vec3.create(),
      object.massCenter,
      object.transform.matrix,
    );
  }

  /**
   * Beräknar förändringen i vinkelhastighet från en
   * vinkelimpuls, utan att faktiskt ändra objektet.
   */
  function getAngularVelocityChange(
    object: PhysicsObject,
    angularImpulse: vec3,
  ): vec3 {
    if (
      object.isStatic ||
      object.isImmovable ||
      object.mass <= 0 ||
      !object.dynamicCollisionResponses
    ) {
      return vec3.create();
    }

    const inverseRotation = quat.invert(
      quat.create(),
      object.transform.rotation,
    );

    const localImpulse = vec3.transformQuat(
      vec3.create(),
      angularImpulse,
      inverseRotation,
    );

    localImpulse[0] *= object.inverseInertiaLocal[0];
    localImpulse[1] *= object.inverseInertiaLocal[1];
    localImpulse[2] *= object.inverseInertiaLocal[2];

    return vec3.transformQuat(
      vec3.create(),
      localImpulse,
      object.transform.rotation,
    );
  }

  /**
   * Effektiv invers massa i en viss riktning vid en kontaktpunkt.
   * Tar hänsyn till både translation och rotation.
   */
  function getEffectiveInverseMass(
    object: PhysicsObject,
    contactPoint: vec3,
    direction: vec3,
  ): number {
    const invMass = getInverseMass(object);

    if (invMass === 0) {
      return 0;
    }

    const worldCenter = getWorldMassCenter(object);
    const r = vec3.subtract(vec3.create(), contactPoint, worldCenter);

    // Vinkelimpuls som skapas av en enhetsimpuls i riktningen.
    const angularImpulse = vec3.cross(vec3.create(), r, direction);

    const angularVelocityChange = getAngularVelocityChange(
      object,
      angularImpulse,
    );

    // Kontaktpunktens hastighetsförändring från rotationen.
    const rotationalVelocityChange = vec3.cross(
      vec3.create(),
      angularVelocityChange,
      r,
    );

    return invMass + vec3.dot(direction, rotationalVelocityChange);
  }

  /**
   * Hastigheten vid kontaktpunkten:
   * linjär hastighet + vinkelhastighet × hävarm.
   */
  function getVelocityAtPoint(object: PhysicsObject, contactPoint: vec3): vec3 {
    const worldCenter = getWorldMassCenter(object);

    const r = vec3.subtract(vec3.create(), contactPoint, worldCenter);

    const rotationalVelocity = vec3.cross(vec3.create(), object.momentum, r);

    return vec3.add(vec3.create(), object.velocity, rotationalVelocity);
  }

  function applyTestRotation(
    object: PhysicsObject,
    contactPoint: vec3,
    impulseDirection: vec3,
  ): void {
    if (object.isStatic || object.isImmovable) {
      return;
    }

    // Från masscentrum till kontaktpunkten.
    let worldMassCenter = vec3.transformMat4(
      vec3.create(),
      object.massCenter,
      object.transform.matrix,
    );

    const r = vec3.subtract(vec3.create(), contactPoint, worldMassCenter);

    // Rotationsaxel: r × impulsriktningen.
    const axis = vec3.cross(vec3.create(), r, impulseDirection);

    if (vec3.squaredLength(axis) < 1e-8) {
      return;
    }

    vec3.normalize(axis, axis);

    // 0,5 varv/s = π radianer/s.
    // Spara axeln separat; hastigheten appliceras i update(dt).
    vec3.copy(object.testRotationAxis, axis);
    object.testRotationActive = true;
  }

  function applyAngularImpulse(
    object: PhysicsObject,
    contactPoint: vec3,
    impulse: vec3,
  ): void {
    if (object.isStatic || object.isImmovable || object.mass <= 0) {
      return;
    }

    let worldMassCenter = vec3.transformMat4(
      vec3.create(),
      object.massCenter,
      object.transform.matrix,
    );

    // Vektorn från masscentrum till kontaktpunkten.
    const r = vec3.subtract(vec3.create(), contactPoint, worldMassCenter);

    // Vinkelimpuls: ΔL = r × J.
    const angularImpulse = vec3.cross(vec3.create(), r, impulse);

    // Omvandla vinkelimpulsen till objektets lokala koordinater.
    const inverseRotation = quat.invert(
      quat.create(),
      object.transform.rotation,
    );

    const localAngularImpulse = vec3.transformQuat(
      vec3.create(),
      angularImpulse,
      inverseRotation,
    );

    // Δω_local = I_local^-1 * ΔL_local.
    localAngularImpulse[0] *= object.inverseInertiaLocal[0];
    localAngularImpulse[1] *= object.inverseInertiaLocal[1];
    localAngularImpulse[2] *= object.inverseInertiaLocal[2];

    // Tillbaka till världskoordinater.
    const worldAngularVelocityChange = vec3.transformQuat(
      vec3.create(),
      localAngularImpulse,
      object.transform.rotation,
    );

    // momentum används här som vinkelhastighet (rad/s).
    vec3.add(object.momentum, object.momentum, worldAngularVelocityChange);
  }

  export function handleCollision(
    intersectionInformation: Array<IntersectionTester.IntersectionInformation>,
    po1: PhysicsObject,
    po2: PhysicsObject,
  ) {
    for (let inf of intersectionInformation) {
      if (inf.depth < skin_width) {
        continue;
      }

      let axis = vec3.clone(inf.axis);

      let e1Vel = po1.velocity;
      let e2Vel = po2.velocity;

      let velDifference = vec3.sub(vec3.create(), e1Vel, e2Vel);
      let dotProd = vec3.dot(velDifference, axis);
      if (dotProd < 0.0) {
        let eN = vec3.cross(
          vec3.create(),
          vec3.cross(vec3.create(), velDifference, axis),
          axis,
        );

        if (vec3.squaredLength(eN) > 0.0001) {
          vec3.normalize(eN, eN);
        }

        let e1Change = vec3.create();
        let e2Change = vec3.create();

        let collisionCoefficient = Math.max(
          po1.collisionCoefficient,
          po2.collisionCoefficient,
        ); // TODO: This can be calculated differently, will be based on material abilities in the future
        let frictionCoefficient = Math.min(
          po1.frictionCoefficient,
          po2.frictionCoefficient,
        ); // TODO: This can be calculated differently, will be based on material abilities in the future

        if (
          po1 &&
          !po1.isStatic &&
          !po1.isImmovable &&
          po2 &&
          !po2.isStatic &&
          !po2.isImmovable
        ) {
          let v1Dot = vec3.dot(e1Vel, axis);
          let v2Dot = vec3.dot(e2Vel, axis);
          let tangentVel1 = vec3.dot(velDifference, eN);
          let tangentVel2 = -tangentVel1;
          let u1Dot =
            ((po1.mass - collisionCoefficient * po2.mass) /
              (po1.mass + po2.mass)) *
              v1Dot +
            (((1.0 + collisionCoefficient) * po2.mass) /
              (po1.mass + po2.mass)) *
              v2Dot;
          let u2Dot =
            ((po2.mass - collisionCoefficient * po1.mass) /
              (po2.mass + po1.mass)) *
              v2Dot +
            (((1.0 + collisionCoefficient) * po1.mass) /
              (po2.mass + po1.mass)) *
              v1Dot;

          let frictionMagnitude1 =
            -tangentVel1 *
            Math.min(
              frictionCoefficient,
              frictionCoefficient * Math.abs(u1Dot - v1Dot),
            );
          let frictionMagnitude2 =
            -tangentVel2 *
            Math.min(
              frictionCoefficient,
              frictionCoefficient * Math.abs(u2Dot - v2Dot),
            );

          vec3.scaleAndAdd(e1Change, e1Change, axis, u1Dot - v1Dot);
          vec3.scaleAndAdd(e1Change, e1Change, eN, frictionMagnitude1);

          vec3.scaleAndAdd(e2Change, e2Change, axis, u2Dot - v2Dot);
          vec3.scaleAndAdd(e2Change, e2Change, eN, frictionMagnitude2);
        } else if (po1.isStatic || po1.isImmovable) {
          let inverseVelDifference = vec3.negate(vec3.create(), velDifference);
          let v2Dot = vec3.dot(inverseVelDifference, axis);
          let relativeTangentVel = vec3.dot(inverseVelDifference, eN);
          let frictionMagnitude =
            relativeTangentVel *
            Math.min(
              frictionCoefficient,
              frictionCoefficient * Math.abs(v2Dot),
            );

          vec3.scaleAndAdd(
            e2Change,
            e2Change,
            axis,
            -v2Dot * (1.0 + collisionCoefficient),
          );
          vec3.scaleAndAdd(e2Change, e2Change, eN, -frictionMagnitude);
        } else if (po2.isStatic || po2.isImmovable) {
          let v1Dot = vec3.dot(velDifference, axis);
          let relativeTangentVel = vec3.dot(velDifference, eN);
          let frictionMagnitude =
            relativeTangentVel *
            Math.min(
              frictionCoefficient,
              frictionCoefficient * Math.abs(v1Dot),
            );

          vec3.scaleAndAdd(
            e1Change,
            e1Change,
            axis,
            -v1Dot * (1.0 + collisionCoefficient),
          );
          vec3.scaleAndAdd(e1Change, e1Change, eN, -frictionMagnitude);
        }

        const contactPoint = inf.point;

        if (contactPoint) {
          // Linear impulses derived from the velocity changes.
          const impulse1 = vec3.scale(vec3.create(), e1Change, po1.mass);

          const impulse2 = vec3.scale(vec3.create(), e2Change, po2.mass);

          if (po1.dynamicCollisionResponses) {
            applyTestRotation(po1, contactPoint, impulse1);
            let visualizationMat = mat4.create();
            mat4.translate(visualizationMat, visualizationMat, contactPoint);
            collisionPointVisualizer.setTransformMatrix(visualizationMat);
          }
          if (po2.dynamicCollisionResponses) {
            applyTestRotation(po2, contactPoint, impulse2);
            let visualizationMat = mat4.create();
            mat4.translate(visualizationMat, visualizationMat, contactPoint);
            collisionPointVisualizer.setTransformMatrix(visualizationMat);
          }
        }

        vec3.add(e1Vel, e1Vel, e1Change);
        if (axis[1] > 0.4) {
          po1.onGround = true;
        }

        vec3.add(e2Vel, e2Vel, e2Change);
        if (axis[1] < -0.4) {
          po2.onGround = true;
        }
      }
    }

    let displacement = CollisionSolver.getTranslationNeeded(
      intersectionInformation,
    );
    let totalMass = po1.mass + po2.mass;
    let po1Part = 0.5;
    let po2Part = 0.5;

    if (totalMass >= 0.0) {
      po1Part = po1.mass / totalMass;
      po2Part = po2.mass / totalMass;
    }

    if (po2.isImmovable || po2.isStatic) {
      po1Part = 1.0;
    }
    if (po1.isImmovable || po1.isStatic) {
      po2Part = 1.0;
    }

    if (!po1.isImmovable && !po1.isStatic) {
      vec3.scaleAndAdd(
        po1.unearthVelocity,
        po1.unearthVelocity,
        displacement,
        po1Part * 10.0,
      );
      // po1.transform.translate(vec3.scale(vec3.create(), displacement, po1Part));
    }

    if (!po2.isImmovable && !po2.isStatic) {
      vec3.scaleAndAdd(
        po2.unearthVelocity,
        po2.unearthVelocity,
        displacement,
        -po2Part * 10.0,
      );
      // po2.transform.translate(
      //   vec3.scale(vec3.create(), displacement, -po2Part)
      // );
    }
  }
}
