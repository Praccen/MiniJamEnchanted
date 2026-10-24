import { mat4, quat, vec3 } from "gl-matrix";
import { IntersectionTester } from "./IntersectionTester.js";
import PhysicsObject from "./Objects/PhysicsObject.js";

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

    const rotationalVelocity = vec3.cross(
      vec3.create(),
      object.angularVelocity,
      r,
    );

    return vec3.add(vec3.create(), object.velocity, rotationalVelocity);
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
    vec3.add(
      object.angularVelocity,
      object.angularVelocity,
      worldAngularVelocityChange,
    );
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

      const contactPoint = inf.point;
      const axis = vec3.normalize(vec3.create(), inf.axis);

      const invMass1 = getInverseMass(po1);
      const invMass2 = getInverseMass(po2);

      if (invMass1 + invMass2 === 0) {
        continue;
      }

      // Hastigheter vid själva kontaktpunkten, inklusive rotation.
      const velocity1 = getVelocityAtPoint(po1, contactPoint);
      const velocity2 = getVelocityAtPoint(po2, contactPoint);

      const relativeVelocity = vec3.subtract(
        vec3.create(),
        velocity1,
        velocity2,
      );

      // Negativ hastighet längs normalen betyder att objekten närmar sig.
      const normalSpeed = vec3.dot(relativeVelocity, axis);

      if (normalSpeed < 0) {
        const restitution = Math.max(
          0,
          Math.max(po1.collisionCoefficient, po2.collisionCoefficient),
        );

        const normalMass =
          getEffectiveInverseMass(po1, contactPoint, axis) +
          getEffectiveInverseMass(po2, contactPoint, axis);

        if (normalMass > 1e-8) {
          // Impulsens storlek längs kollisionsnormalen.
          const normalImpulseMagnitude =
            (-(1 + restitution) * normalSpeed) / normalMass;

          const normalImpulse = vec3.scale(
            vec3.create(),
            axis,
            normalImpulseMagnitude,
          );

          // Friktionsimpuls längs kontaktens tangentplan.
          const tangentVelocity = vec3.scaleAndAdd(
            vec3.create(),
            relativeVelocity,
            axis,
            -normalSpeed,
          );

          const tangentSpeed = vec3.length(tangentVelocity);

          let frictionImpulse = vec3.create();

          if (tangentSpeed > 1e-8) {
            const tangent = vec3.scale(
              vec3.create(),
              tangentVelocity,
              1 / tangentSpeed,
            );

            const tangentMass =
              getEffectiveInverseMass(po1, contactPoint, tangent) +
              getEffectiveInverseMass(po2, contactPoint, tangent);

            if (tangentMass > 1e-8) {
              const frictionCoefficient = Math.max(
                0,
                Math.min(po1.frictionCoefficient, po2.frictionCoefficient),
              );

              // Coulomb-liknande friktion: begränsad av normalimpulsen.
              const desiredFrictionMagnitude = tangentSpeed / tangentMass;
              const maxFrictionMagnitude =
                frictionCoefficient * normalImpulseMagnitude;

              const frictionMagnitude = Math.min(
                desiredFrictionMagnitude,
                maxFrictionMagnitude,
              );

              frictionImpulse = vec3.scale(
                vec3.create(),
                tangent,
                -frictionMagnitude,
              );
            }
          }

          // Samlad impuls på po1. po2 får motsatt impuls.
          const impulse = vec3.add(
            vec3.create(),
            normalImpulse,
            frictionImpulse,
          );

          const oppositeImpulse = vec3.negate(vec3.create(), impulse);

          // Linjär rörelse.
          vec3.scaleAndAdd(po1.velocity, po1.velocity, impulse, invMass1);

          vec3.scaleAndAdd(
            po2.velocity,
            po2.velocity,
            oppositeImpulse,
            invMass2,
          );

          // Rotation. Statiska/immovable objekt ignoreras av funktionen.
          applyAngularImpulse(po1, contactPoint, impulse);
          applyAngularImpulse(po2, contactPoint, oppositeImpulse);
        }
      }

      if (axis[1] > 0.4) {
        po1.onGround = true;
      }

      if (axis[1] < -0.4) {
        po2.onGround = true;
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
}
