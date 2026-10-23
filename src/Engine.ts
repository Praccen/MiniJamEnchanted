import { glMatrix } from "gl-matrix";
import Renderer3D from "./Engine/Rendering/Renderer/Renderer3D.js";
import Renderer2D from "./Engine/Rendering/Renderer/Renderer2D.js";
import Scene from "./Engine/Rendering/Renderer/Scene.js";
import GraphicsBundle from "./Engine/Rendering/Objects/Bundles/GraphicsBundle.js";
import AnimatedGraphicsBundle from "./Engine/Rendering/Objects/Bundles/AnimatedGraphicsBundle.js";
import Camera from "./Engine/Rendering/Objects/Camera.js";
import { GUIRenderer } from "./Engine/Rendering/GUI/GUIRenderer.js";
import PhysicsScene from "./Engine/Physics/Physics/PhysicsScene.js";
import PhysicsObject from "./Engine/Physics/Physics/Objects/PhysicsObject.js";
import Frustum from "./Engine/Physics/Physics/Shapes/Frustum.js";
import Shape from "./Engine/Physics/Physics/Shapes/Shape.js";
import Ray from "./Engine/Physics/Physics/Shapes/Ray.js";
import Transform from "./Engine/Shared/Transform.js";
import { MousePicking } from "./Engine/Physics/Maths/MousePicking.js";
import TextObject2D from "./Engine/Rendering/GUI/Objects/Text/TextObject2D.js";
import TextObject3D from "./Engine/Rendering/GUI/Objects/Text/TextObject3D.js";
import EditText from "./Engine/Rendering/GUI/Objects/Text/EditText.js";
import Slider from "./Engine/Rendering/GUI/Objects/Slider.js";
import Checkbox from "./Engine/Rendering/GUI/Objects/Checkbox.js";
import Button from "./Engine/Rendering/GUI/Objects/Button.js";
import Div from "./Engine/Rendering/GUI/Objects/Div.js";
import Progress from "./Engine/Rendering/GUI/Objects/Progress.js";
import PointLight from "./Engine/Rendering/Objects/Lighting/PointLight.js";
import ShapeGraphicsObject from "./Engine/Rendering/Objects/GraphicsObjects/ShapeGraphicsObject.js";
import ParticleSpawner from "./Engine/Rendering/Objects/InstancedGraphicsObjects/ParticleSpawner.js";
import Heightmap from "./Engine/Rendering/Objects/GraphicsObjects/Heightmap.js";
import WorldEditor, {
  addNewConsoleCommand,
} from "./Engine/Tooling/WorldEditor.js";
import Vec3Lerp from "./Engine/Tooling/Vec3Lerp.js";

// Rendering exports
export { Renderer3D, Renderer2D, GUIRenderer, Scene, Camera };
// Physics exports
export { PhysicsScene, PhysicsObject, Ray, MousePicking, Frustum, Shape };
// Math exports
export * from "gl-matrix";
// Shared exports
export { Transform };
// GUI exports
export {
  TextObject2D,
  TextObject3D,
  Slider,
  Checkbox,
  Button,
  Div,
  Progress,
  EditText,
};
// Graphics
export {
  PointLight,
  ShapeGraphicsObject,
  GraphicsBundle,
  AnimatedGraphicsBundle,
  ParticleSpawner,
  Heightmap,
};

// Tooling
export { WorldEditor, addNewConsoleCommand, Vec3Lerp };

// Global exports
export let applicationStartTime = Date.now();

glMatrix.setMatrixArrayType(Array);
