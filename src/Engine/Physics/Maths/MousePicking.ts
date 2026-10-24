import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import Ray from "../Physics/Shapes/Ray.js";
import { Camera, PhysicsObject, PhysicsScene } from "../../../Engine.js";
import RendererBase from "../../Rendering/Renderer/RendererBase.js";

export namespace MousePicking {
  export function GetRayHitPosition(
    camera: Camera,
    renderer: RendererBase,
    mousePosition: vec2,
    physicsScene: PhysicsScene,
    ignoreNonCollidableObjects = true,
  ): vec3 {
    let rect = renderer.domElement.getClientRects()[0];
    let ndc = vec2.fromValues(
      (mousePosition[0] - rect.left) / rect.width,
      (mousePosition[1] - rect.top) / rect.height,
    );
    ndc[0] = ndc[0] * 2.0 - 1.0;
    ndc[1] = ndc[1] * -2.0 + 1.0;

    let ray = MousePicking.GetRay(camera, ndc);
    let dist = physicsScene.doRayCast(ray, ignoreNonCollidableObjects).distance;
    if (dist < Infinity) {
      return vec3.scaleAndAdd(
        vec3.create(),
        camera.getPosition(),
        ray.getDir(),
        dist,
      );
    }
    return null;
  }

  export function GetRayHit(
    camera: Camera,
    renderer: RendererBase,
    mousePosition: vec2,
    physicsScene: PhysicsScene,
    ignoreNonCollidableObjects = true,
  ): { distance: number; object: PhysicsObject } {
    let rect = renderer.domElement.getClientRects()[0];
    let ndc = vec2.fromValues(
      (mousePosition[0] - rect.left) / rect.width,
      (mousePosition[1] - rect.top) / rect.height,
    );
    ndc[0] = ndc[0] * 2.0 - 1.0;
    ndc[1] = ndc[1] * -2.0 + 1.0;

    let ray = MousePicking.GetRay(camera, ndc);
    return physicsScene.doRayCast(ray, ignoreNonCollidableObjects);
  }

  export function GetRay(camera: Camera, mouseNDC: vec2): Ray {
    let mouseRayClip = vec4.fromValues(mouseNDC[0], mouseNDC[1], -1.0, 1.0);
    let mouseRayCamera = vec4.transformMat4(
      vec4.create(),
      mouseRayClip,
      mat4.invert(mat4.create(), camera.getProjectionMatrix()),
    );
    mouseRayCamera[2] = -1.0;
    mouseRayCamera[3] = 0.0;
    let mouseRayWorld4D = vec4.transformMat4(
      vec4.create(),
      mouseRayCamera,
      mat4.invert(mat4.create(), camera.getViewMatrix()),
    );
    let dir = vec3.normalize(
      vec3.create(),
      vec3.fromValues(
        mouseRayWorld4D[0],
        mouseRayWorld4D[1],
        mouseRayWorld4D[2],
      ),
    );

    let ray = new Ray();
    ray.setDir(dir);
    ray.setStart(vec3.clone(camera.getPosition()));

    return ray;
  }
}
