import {
  addNewConsoleCommand,
  Camera,
  Frustum,
  GUIRenderer,
  MousePicking,
  PhysicsScene,
  Renderer3D,
  Scene,
  vec3,
  WorldEditor,
} from "praccen-web-engine";
import GameGUI from "../GUI/GameGUI.js";
import { Input } from "../Input.js";
import { vec2 } from "gl-matrix";
import { tickRate } from "../main.js";
import Player from "../Objects/Player.js";

let game: Game = null;

export default class Game {
  private pWasPressed = false;

  private renderer: Renderer3D;
  guiRenderer: GUIRenderer;

  seed: string;
  camera: Camera;
  gui: GameGUI;

  scene: Scene;
  physicsScene: PhysicsScene;
  player: Player;

  private gameTimer = 0.0;

  private saveScreenshot = false;

  worldEditor: WorldEditor;

  constructor(renderer: Renderer3D, guiRenderer: GUIRenderer, seed: string) {
    this.seed = seed;
    game = this;
    this.renderer = renderer;
    this.guiRenderer = guiRenderer;

    this.renderer.useVolumetric = true;
    this.renderer.setFogTexture("Assets/Textures/Fog.png");

    // Create a camera and set it's starting position
    this.camera = new Camera();
    this.camera.setPosition(vec3.fromValues(0.0, 10.0, 7.0));
    this.camera.setDir(vec3.fromValues(0.0, -1.0, -0.7));
    this.camera.setFarPlaneDistance(150);
    this.camera.setFOV(80);

    this.gui = new GameGUI(this.guiRenderer);
    this.gui.gameGuiDiv.setHidden(true);

    this.scene = new Scene(this.renderer);
    this.scene.getDirectionalLight().ambientMultiplier = 0.5;
    this.physicsScene = new PhysicsScene();

    this.player = new Player(this.scene, this.physicsScene, vec3.create());

    this.worldEditor = new WorldEditor(
      this.camera,
      this.scene,
      this.physicsScene,
      this.guiRenderer,
    );

    this.worldEditor.loadWorld([
      "Assets/placements/placements.json",
      "Assets/placements/floor.json",
      "Assets/placements/walls-livingroom.json",
      "Assets/placements/walls-hallway.json",
      "Assets/placements/livingroom.json",
    ]);

    this.worldEditor.internalPhysicsScene.addNewPhysicsObject(
      null,
      this.player.physicsObject,
    );

    this.physicsScene.update(0.0, true, false);

    addNewConsoleCommand(
      "add box",
      (args: string[]) => {
        let box = this.scene.addNewMesh(
          "Assets/objs/cube.obj",
          args[2] ?? "CSS:rgb(255, 0, 0)",
          "CSS:rgb(0, 0, 0)",
        );
        let po = this.physicsScene.addNewPhysicsObject(box.transform);
        this.worldEditor.internalPhysicsScene.addNewPhysicsObject(null, po);
        this.worldEditor.setSelectedTransform(box.transform);
        return "Added box";
      },
      true,
    );

    addNewConsoleCommand("set ssaa", (args: string[]) => {
      const requested = parseFloat(args[2]);
      if (isNaN(requested)) {
        return (
          "Usage: set ssaa <factor>, current: " + this.renderer.getSSAAFactor()
        );
      }
      this.renderer.setSSAAFactor(requested);
      // setSSAAFactor re-applies the last display size, so the camera and GUI
      // need nothing here. Report what we actually clamped to.
      return "SSAA factor set to " + this.renderer.getSSAAFactor();
    });

    addNewConsoleCommand("get ssaa", () => {
      return "SSAA factor: " + this.renderer.getSSAAFactor();
    });

    // ---- Performance tunables ----
    addNewConsoleCommand("set fogscale", (args: string[]) => {
      const requested = parseFloat(args[2]);
      if (isNaN(requested)) {
        return (
          "Usage: set fogscale <scale>, current: " +
          this.renderer.getFogRenderScale()
        );
      }
      this.renderer.setFogRenderScale(Math.min(Math.max(requested, 0.1), 1.0));
      return "Fog render scale set to " + this.renderer.getFogRenderScale();
    });

    addNewConsoleCommand("get fogscale", () => {
      return "Fog render scale: " + this.renderer.getFogRenderScale();
    });

    addNewConsoleCommand("set fogsteps", (args: string[]) => {
      const requested = parseInt(args[2]);
      if (isNaN(requested)) {
        return (
          "Usage: set fogsteps <steps>, current: " + this.renderer.getFogSteps()
        );
      }
      this.renderer.setFogSteps(requested);
      return "Fog raymarch steps set to " + this.renderer.getFogSteps();
    });

    addNewConsoleCommand("get fogsteps", () => {
      return "Fog raymarch steps: " + this.renderer.getFogSteps();
    });

    addNewConsoleCommand("toggle fog", () => {
      this.renderer.useVolumetric = !this.renderer.useVolumetric;
      return "Volumetric fog " + (this.renderer.useVolumetric ? "on" : "off");
    });

    addNewConsoleCommand("set shadowres", (args: string[]) => {
      const requested = parseInt(args[2]);
      if (isNaN(requested)) {
        return (
          "Usage: set shadowres <texels>, current: " +
          this.renderer.getShadowMappingResolution()
        );
      }
      this.renderer.setShadowMappingResolution(
        Math.min(Math.max(requested, 64), 4096),
      );
      return (
        "Shadow map resolution set to " +
        this.renderer.getShadowMappingResolution()
      );
    });

    addNewConsoleCommand("get shadowres", () => {
      return (
        "Shadow map resolution: " + this.renderer.getShadowMappingResolution()
      );
    });

    addNewConsoleCommand("set shadowinterval", (args: string[]) => {
      const requested = parseInt(args[2]);
      if (isNaN(requested)) {
        return (
          "Usage: set shadowinterval <frames>, current: " +
          this.renderer.getShadowUpdateInterval()
        );
      }
      this.renderer.setShadowUpdateInterval(requested);
      return (
        "Shadow update interval set to " +
        this.renderer.getShadowUpdateInterval()
      );
    });

    addNewConsoleCommand("get shadowinterval", () => {
      return (
        "Shadow update interval: " + this.renderer.getShadowUpdateInterval()
      );
    });
    // ------------------------------
  }

  resize(width: number, height: number) {
    // Update the camera aspect ratio to fit the new size
    this.camera.setAspectRatio(width / height);

    // Update the size of both the renderer and GUI renderer
    this.renderer.setSize(width, height, true);
    this.guiRenderer.setSize(width, height);
  }

  onExit() {}

  update(dt: number) {
    this.gameTimer += dt;

    if (!this.worldEditor.interacting()) {
      this.player.update(this.camera, dt);
    }
    this.physicsScene.update(dt);
  }

  preRenderingUpdate(dt: number) {
    this.player.preRenderingUpdate(dt);

    this.worldEditor.preRenderingUpdate();

    if (!this.worldEditor.interacting && Input.keys["P"]) {
      if (!this.pWasPressed) {
        this.saveScreenshot = true;
      }
      this.pWasPressed = true;
    } else {
      this.pWasPressed = false;
    }
  }

  draw() {
    if (this.saveScreenshot) {
      this.renderer.render(
        this.scene,
        this.camera,
        this.camera.getFrustum(),
        true,
        "captureScreen.png",
      );
      this.saveScreenshot = false;
    } else {
      this.renderer.render(this.scene, this.camera, this.camera.getFrustum());
    }

    this.guiRenderer.draw(this.camera);
  }
}
