import { quat } from "gl-matrix";
import { GraphicsBundle, mat4, vec3 } from "../../../../Engine.js";
import GraphicsObject from "../../../Rendering/Objects/GraphicsObjects/GraphicsObject.js";
import Transform from "../../../Shared/Transform.js";
import Tree, {
  TreeNode,
  TreeNodeContentElement,
} from "../../../Shared/Trees/Tree.js";
import OBB from "../Shapes/OBB.js";
import Shape from "../Shapes/Shape.js";
import Triangle from "../Shapes/Triangle.js";

export let pathInternalTreeMap: Map<string, Tree> = new Map<string, Tree>();

export default class PhysicsObject {
  static idCounter = 0;
  mass: number = 1.0;
  massCenter: vec3 = vec3.create();
  frictionCoefficient: number = 0.0;
  collisionCoefficient: number = 0.0;
  drag: number = 0.0;
  angularDamping: number = 2.0;
  velocity: vec3 = vec3.create();
  impulse: vec3 = vec3.create();
  force: vec3 = vec3.create();
  physicsObjectId: number;
  angularVelocity: vec3 = vec3.create();
  inverseInertiaLocal: vec3 = vec3.create();

  testRotationAxis: vec3 = vec3.create();
  testRotationActive = false;

  unearthVelocity: vec3 = vec3.create();

  /**
   * True if this object never moves
   */
  isStatic: boolean = false;
  /**
   * True if this object is not effected by collisions (but could potentially effect other objects through collision)
   */
  isImmovable: boolean = false;
  /**
   * True if this object should effect other objects on collision
   */
  isCollidable: boolean = true;

  /**
   * True if this object should look for objects to collide with
   * False means this will only collide with objects if the other object looks for the collision
   */
  checksForCollisions: boolean = true;

  /**
   * True if this object shouldn't be effected by gravity
   */
  ignoreGravity: boolean = false;

  /**
   * True if this object should have dynamic collisions (rotations)
   */
  dynamicCollisionResponses: boolean = false;

  /**
   * Tree holding the triangles of the mesh, if mesh collision has been set up for this object
   */
  internalTree?: Tree;

  onGround: boolean = false;

  /**
   * Tracks ids of physics objects collided with last update
   */
  collisionsLastUpdate: Set<number> = new Set<number>();

  boundingBox: OBB;

  transform: Transform;

  constructor(transform?: Transform) {
    this.physicsObjectId = PhysicsObject.idCounter++;
    if (transform == undefined) {
      this.transform = new Transform();
    } else {
      this.transform = transform;
    }
    this.boundingBox = new OBB();
    this.boundingBox.setTransformMatrix(this.transform.matrix);
  }

  // fullSize object size in local coordinates
  calculateBoxInertia(fullSize: vec3): void {
    if (this.isStatic || this.isImmovable || this.mass <= 0) {
      vec3.zero(this.inverseInertiaLocal);
      return;
    }

    const w = fullSize[0];
    const h = fullSize[1];
    const d = fullSize[2];
    const m = this.mass;

    const ix = (m / 12) * (h * h + d * d);
    const iy = (m / 12) * (w * w + d * d);
    const iz = (m / 12) * (w * w + h * h);

    this.inverseInertiaLocal[0] = ix > 1e-8 ? 1 / ix : 0;
    this.inverseInertiaLocal[1] = iy > 1e-8 ? 1 / iy : 0;
    this.inverseInertiaLocal[2] = iz > 1e-8 ? 1 / iz : 0;
  }

  setupBoundingBoxFromGraphicsBundle(bundle: GraphicsBundle) {
    bundle.updateMinAndMaxPositions();
    const min = bundle.getMinAndMaxPositions().min;
    const max = bundle.getMinAndMaxPositions().max;

    this.boundingBox.setMinAndMaxVectors(min, max);
    this.calculateBoxInertia(vec3.sub(vec3.create(), max, min));
  }

  setupInternalTree(shapes: Array<Shape>) {
    this.internalTree = new Tree(
      new TreeNode(1.0, vec3.create(), 0.05, 10, [true, true, true]),
    );
    this.internalTree.addContentArray(
      shapes.map<TreeNodeContentElement>((shape) => {
        return new TreeNodeContentElement(shape);
      }),
    );
  }

  setupInternalTreeFromGraphicsObject(
    graphicsObject: GraphicsObject,
    path?: string,
  ) {
    if (path != undefined && pathInternalTreeMap.has(path)) {
      this.internalTree = pathInternalTreeMap.get(path);
      return;
    }

    let positions = graphicsObject.getVertexPositions(); // This assumes that the vec3 array is built with every three positions being one triangle
    let treeNodes: TreeNodeContentElement[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      let index =
        treeNodes.push(new TreeNodeContentElement(new Triangle())) - 1;
      (<Triangle>treeNodes[index].shape).setVertices(
        positions[i],
        positions[i + 1],
        positions[i + 2],
      );
    }

    this.internalTree = new Tree(
      new TreeNode(1.0, vec3.create(), 0.05, 10, [true, true, true]),
    );
    this.internalTree.addContentArray(treeNodes);

    if (path != undefined) {
      pathInternalTreeMap.set(path, this.internalTree);
    }
  }
}
