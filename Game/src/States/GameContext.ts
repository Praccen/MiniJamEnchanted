import { GUIRenderer, Renderer3D } from "praccen-web-engine";
import Game from "./Game.js";

export let sensitivity = 1.0;
export let fastForwardRate = 1.0;

export default class GameContext {
  private renderer: Renderer3D;
  guiRenderer: GUIRenderer;

  game: Game;

  constructor() {
    // Create a renderer and attach it to the document body
    this.renderer = new Renderer3D();
    document.body.appendChild(this.renderer.domElement);

    // Supersample 2x per axis to resolve the hard voxel edges. Adjustable at
    // runtime with the "set ssaa" console command if this is too slow.
    this.renderer.setSSAAFactor(2.0);

    this.renderer.useVolumetric = true;
    this.renderer.setFogTexture("Assets/Textures/Fog.png");

    // Create a GUI renderer and attach it to the document body
    this.guiRenderer = new GUIRenderer();
    document.body.appendChild(this.guiRenderer.domElement);

    // Set the class to apply style defined in index.css
    this.guiRenderer.domElement.className = "guiContainer";
  }

  resize(width: number, height: number) {
    if (!this.game) {
      return;
    }
    this.game.resize(width, height);
  }

  onExit() {
    if (this.game) {
      this.game.onExit();
    }

    // Save rendering settings if exposed to be changed through console or similar. To local storage
  }

  async loadMeshes(progress: {
    requested: number;
    loaded: number;
  }): Promise<void> {
    return new Promise<void>((resolve, rejects) => {
      let meshes = [
        "Assets/objs/cube.obj",
        "Assets/objs/VoxelInterior/ChairBirchBlueSeat_00.obj",
        "Assets/objs/VoxelInterior/TilesWoodenGroundFloor_01.obj",
        "Assets/objs/VoxelInterior/WallpaperPaleGreenBack_00.obj",
        "Assets/objs/VoxelInterior/WallpaperDarkBrownSide_B_00.obj",
        "Assets/objs/VoxelInterior/CenterTable_00.obj",
        "Assets/objs/VoxelInterior/ChairDarkBrownWithBlueSeat_02.obj",
      ];

      progress.requested = meshes.length;

      this.renderer.meshStore.loadMeshes(meshes, progress).then(() => {
        resolve();
      });
    });
  }

  start(seed: string) {
    this.game = new Game(this.renderer, this.guiRenderer, seed);
    this.game.gui.gameGuiDiv.setHidden(false);
  }

  update(dt: number) {
    if (!this.game) {
      return;
    }

    this.game.update(dt);
  }

  preRendereringUpdate(dt: number) {
    if (!this.game) {
      return;
    }
    this.game.preRenderingUpdate(dt);
  }

  draw() {
    if (!this.game) {
      return;
    }
    this.game.draw();
  }
}
