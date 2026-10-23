import { ReadonlyVec3, vec3 } from "gl-matrix";
import Shape from "../../Physics/Physics/Shapes/Shape.js";
import { IntersectionTester } from "../../Physics/Physics/IntersectionTester.js";
import { Ray } from "../../../Engine.js";
import TreeAABB from "../../Physics/Physics/Shapes/TreeAABB.js";

const InfinityLike = 999999999;

export class TreeNodeContentElement {
  // You can inherit from this to create any content you want in the octree
  shape: Shape;
  constructor(detectionShape: Shape) {
    this.shape = detectionShape;
  }
}

export class TreeNode {
  aabb: TreeAABB;
  size: number;
  position: vec3;
  minNodeSize: number;
  maxContentPerNode: number;
  children: Array<TreeNode>;
  content: Array<TreeNodeContentElement>;
  dimensions: boolean[]; // true for including a dimension, 0 for not

  constructor(
    size: number,
    position: vec3,
    minNodeSize: number,
    maxContentPerNode: number,
    dimensions: boolean[]
  ) {
    this.dimensions = dimensions;
    this.aabb = new TreeAABB();
    this.size = size;
    this.position = position;
    this.maxContentPerNode = maxContentPerNode;
    this.minNodeSize = minNodeSize;
    let halfSize = size * 0.5;
    this.aabb.setMinAndMaxVectors(
      vec3.add(
        vec3.create(),
        vec3.fromValues(
          dimensions[0] ? -halfSize : -InfinityLike,
          dimensions[1] ? -halfSize : -InfinityLike,
          dimensions[2] ? -halfSize : -InfinityLike
        ),
        this.position
      ),
      vec3.add(
        vec3.create(),
        vec3.fromValues(
          dimensions[0] ? halfSize : InfinityLike,
          dimensions[1] ? halfSize : InfinityLike,
          dimensions[2] ? halfSize : InfinityLike
        ),
        this.position
      )
    );

    this.children = new Array<TreeNode>();
    this.content = new Array<TreeNodeContentElement>();
  }

  /**
   * Create 8 child nodes
   * @returns if new children was created. Will be false if there already exists children for this node or the sizes of the children would be smaller than minNodeSize.
   */
  createChildren(): boolean {
    let halfSize = this.size * 0.5;
    if (this.children.length == 0 && halfSize >= this.minNodeSize) {
      let quarterSize = this.size * 0.25;
      for (let x = this.dimensions[0] ? -1 : 0; x < 2; x += 2) {
        for (let y = this.dimensions[1] ? -1 : 0; y < 2; y += 2) {
          for (let z = this.dimensions[2] ? -1 : 0; z < 2; z += 2) {
            this.children.push(
              new TreeNode(
                halfSize,
                vec3.add(
                  vec3.create(),
                  vec3.fromValues(
                    x * quarterSize,
                    y * quarterSize,
                    z * quarterSize
                  ),
                  this.position
                ),
                this.minNodeSize,
                this.maxContentPerNode,
                this.dimensions
              )
            );
          }
        }
      }

      return true;
    }

    return false;
  }

  protected checkIfContains(shape: Shape) {
    let shapeVertices = shape.getTransformedVertices();
    for (const vertex of shapeVertices) {
      for (let i = 0; i < 3; i++) {
        if (Math.abs(vertex[i] - this.position[i]) > this.size / 2.0) {
          return false;
        }
      }
    }
    return true;
  }

  getExpansionDirection(shape: Shape) {
    let shapeVertices = shape.getTransformedVertices();
    let distMax = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    let distMin = vec3.fromValues(Infinity, Infinity, Infinity);
    for (let vertex of shapeVertices) {
      vec3.max(
        distMax,
        distMax,
        vec3.sub(vec3.create(), vertex, this.position)
      );
      vec3.min(
        distMin,
        distMin,
        vec3.sub(vec3.create(), vertex, this.position)
      );
    }

    let expansionDirection = vec3.create();
    for (let i = 0; i < 3; i++) {
      if (Math.abs(distMax[i]) > Math.abs(distMin[i])) {
        expansionDirection[i] = distMax[i];
      } else {
        expansionDirection[i] = distMin[i];
      }
    }

    // Make the expansion direction be 1 or -1 in every direction
    for (let i = 0; i < 3; i++) {
      if (!this.dimensions[i]) {
        expansionDirection[i] = 0;
        continue;
      }

      expansionDirection[i] = Math.sign(expansionDirection[i]); // Sign can be 0, if so, make it one
      if (Math.abs(expansionDirection[i]) < 0.01) {
        expansionDirection[i] = 1.0;
      }
    }
    return expansionDirection;
  }

  expand(expansionDirection: ReadonlyVec3): TreeNode {
    let newBaseNode = new TreeNode(
      this.size * 2.0,
      vec3.scaleAndAdd(
        vec3.create(),
        this.position,
        expansionDirection,
        this.size * 0.5
      ),
      this.minNodeSize,
      this.maxContentPerNode,
      this.dimensions
    ); // Make a new base node with twice the size of the current. Set it's center in the expand direction
    if (!newBaseNode.createChildren()) {
      // Create children
      console.error("Octree couldn't create children when expanding");
      return null;
    }

    let childIndex = newBaseNode.children.findIndex((value) => {
      return vec3.dist(value.position, this.position) < 0.00001;
    });

    if (childIndex == -1) {
      console.error(
        "Octree: Couldn't find child to replace with previous base node when expanding base node"
      );
    } else {
      newBaseNode.children[childIndex] = this;
    }

    return newBaseNode; // Set the current base node to the newly created, bigger one
  }

  count(): number {
    let counter = this.content.length;
    for (const child of this.children) {
      counter += child.count();
    }

    return counter;
  }

  subdivideTree() {
    this.createChildren();

    for (let child of this.children) {
      child.subdivideTree();
    }
  }

  addContent(content: TreeNodeContentElement): boolean {
    if (this.checkIfContains(content.shape)) {
      if (this.children.length == 0) {
        // Leaf node
        if (this.content.length >= this.maxContentPerNode) {
          // New children are needed
          this.createChildren(); // This will create children if the size of the child nodes are still bigger than the minNodeSize
        }

        if (this.children.length == 0) {
          // Still leaf node
          this.content.push(content);
          return true;
        } else {
          // No longer leaf node
          // Add all the content from this node to child nodes instead (if they fit)

          // Below seems stupid, but it avoids copy
          let toMove = this.content.splice(0, this.content.length);
          while (toMove.length > 0) {
            let element = toMove.pop();
            let added = false;
            for (const child of this.children) {
              if (child.addContent(element)) {
                added = true;
                break;
              }
            }
            if (!added) {
              this.content.push(element);
            }
          }
        }
      }

      // Not leaf node, try to add to children
      for (const child of this.children) {
        if (child.addContent(content)) {
          return true;
        }
      }

      // Couldn't fit content into any child, add to this
      this.content.push(content);
      return true;
    }
    return false;
  }

  removeContent(searchPredicate: (value: TreeNodeContentElement) => {}) {
    let findIdx = this.content.findIndex(searchPredicate);
    if (findIdx != -1) {
      this.content.splice(findIdx, 1);
      return;
    }

    for (const child of this.children) {
      child.removeContent(searchPredicate);
    }
  }

  recalculate(
    recalculatedContentArray: Array<TreeNodeContentElement>,
    performActionPerContent: (content: TreeNodeContentElement) => void
  ) {
    // Go to the bottom of the tree and pick up any content that no longer fits
    for (const child of this.children) {
      child.recalculate(recalculatedContentArray, performActionPerContent);
    }

    for (let i = 0; i < recalculatedContentArray.length; i++) {
      // Try to add the content that didn't fit some child to this node, to see if we need to bring this up further
      if (this.addContent(recalculatedContentArray[i])) {
        recalculatedContentArray.splice(i, 1);
        i--;
      }
    }

    // Store the content that no longer fits in their node
    for (let i = 0; i < this.content.length; i++) {
      performActionPerContent(this.content[i]);
      if (!this.checkIfContains(this.content[i].shape)) {
        recalculatedContentArray.push(this.content[i]);
        this.content.splice(i, 1);
        i--;
      }
    }
  }

  prune() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].prune();
    }

    for (const child of this.children) {
      if (child.content.length > 0 || child.children.length > 0) {
        return;
      }
    }

    // If we got here it means all children are empty on both content and children, then we can clear the children for this node
    this.children.length = 0;
  }

  getContentFromIntersection(
    intersectionShapes: Shape[],
    contentArray: Array<TreeNodeContentElement>
  ) {
    for (const intersectionShape of intersectionShapes) {
      if (
        !IntersectionTester.identifyIntersection(
          [intersectionShape],
          [this.aabb]
        )
      ) {
        return;
      }
    }

    for (const child of this.children) {
      child.getContentFromIntersection(intersectionShapes, contentArray);
    }

    for (const content of this.content) {
      contentArray.push(content);
    }
  }

  getContentFromContinousIntersection(
    intesectionShape: Shape,
    velocity1: vec3,
    velocity2: vec3,
    contentArray: Array<TreeNodeContentElement>,
    maxTime: number = Infinity
  ) {
    if (
      IntersectionTester.doContinousIntersection(
        [intesectionShape],
        velocity1,
        [this.aabb],
        velocity2,
        maxTime
      )[0] >= 0.0
    ) {
      for (const child of this.children) {
        child.getContentFromContinousIntersection(
          intesectionShape,
          velocity1,
          velocity2,
          contentArray,
          maxTime
        );
      }

      for (const content of this.content) {
        contentArray.push(content);
      }
    }
  }

  getContentForRayCast(
    ray: Ray,
    contentArray: Array<TreeNodeContentElement>,
    maxDistance: number = Infinity
  ) {
    if (
      IntersectionTester.doRayCast(ray, [this.aabb], maxDistance) < Infinity
    ) {
      for (const child of this.children) {
        child.getContentForRayCast(ray, contentArray, maxDistance);
      }

      for (const content of this.content) {
        contentArray.push(content);
      }
    }
  }

  getAllContent(contentArray: Array<TreeNodeContentElement>) {
    for (const child of this.children) {
      child.getAllContent(contentArray);
    }

    for (const content of this.content) {
      contentArray.push(content);
    }
  }
}

export default class Tree {
  baseNode: TreeNode;
  private minVec: vec3;
  private maxVec: vec3;

  /**
   * This is an Octree if the base node has all directions, a Quadtree if it has just two directions, and a binary tree if it has only one direction.
   * @param baseNode
   */
  constructor(baseNode: TreeNode) {
    this.baseNode = baseNode;
  }

  addContent(content: TreeNodeContentElement) {
    if (!this.baseNode.addContent(content)) {
      // Expand root node, or rather create a level higher and add the current root node as one of the children
      const expansionDirection = this.baseNode.getExpansionDirection(
        content.shape
      ); // Get the direction to expand in (this should be overwritten by child classes)
      const newBaseNode = this.baseNode.expand(expansionDirection);
      if (newBaseNode != undefined) {
        this.baseNode = newBaseNode;
        // Try adding the content to the new baseNode by calling this function again (which will allow it to keep expanding if still needed)
        this.addContent(content);
      }
    }
  }

  addContentArray(contents: Array<TreeNodeContentElement>) {
    for (let content of contents) {
      this.addContent(content);
    }
  }

  removeContent(searchPredicate: (value: TreeNodeContentElement) => {}) {
    this.baseNode.removeContent(searchPredicate);
  }

  recalculate(
    performActionPerContent: (content: TreeNodeContentElement) => void = (
      content
    ) => {}
  ) {
    let recalculatedContentArray = new Array<TreeNodeContentElement>(); // This will traverse the tree and pick up and place items that has moved
    // const countBefore = this.baseNode.count();
    this.baseNode.recalculate(
      recalculatedContentArray,
      performActionPerContent
    );
    // const countDuring = this.baseNode.count();
    // if (countBefore != countDuring + recalculatedContentArray.length) {
    // 	console.error("Recalculation of octree: Sum of content moved outside of tree and the content inside of tree did not result in the same number of items as was in the the tree before recalculation")
    // }
    this.addContentArray(recalculatedContentArray); // If there are still elements in the array once the recalculation is done, we have to expand the base node, this will be done by adding the content to the octree again
    // const countAfter = this.baseNode.count();
    // if (countBefore != countAfter) {
    // 	console.error("Recalculation of octree: Number of content elements changed during recalculation");
    // }
  }

  prune() {
    this.baseNode.prune();
  }

  getContentFromIntersection(
    intesectionShapes: Shape[],
    contentArray: Array<TreeNodeContentElement>
  ) {
    this.baseNode.getContentFromIntersection(intesectionShapes, contentArray);
  }

  getContentFromContinousIntersection(
    intesectionShape: Shape,
    velocity1: vec3,
    velocity2: vec3,
    contentArray: Array<TreeNodeContentElement>,
    maxTime: number = Infinity
  ) {
    this.baseNode.getContentFromContinousIntersection(
      intesectionShape,
      velocity1,
      velocity2,
      contentArray,
      maxTime
    );
  }

  getContentForRayCast(
    ray: Ray,
    contentArray: Array<TreeNodeContentElement>,
    maxDistance: number = Infinity
  ) {
    this.baseNode.getContentForRayCast(ray, contentArray, maxDistance);
  }

  getAllContent(contentArray: Array<TreeNodeContentElement>) {
    this.baseNode.getAllContent(contentArray);
  }
}
