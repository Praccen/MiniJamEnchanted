import { quat, vec2, vec3 } from "gl-matrix";
import {
  Camera,
  Div,
  GraphicsBundle,
  GUIRenderer,
  MousePicking,
  PhysicsObject,
  PhysicsScene,
  Renderer3D,
  Scene,
  TextObject2D,
  Transform,
} from "../../Engine.js";
import EditText from "../Rendering/GUI/Objects/Text/EditText.js";
import TranslateGizmo from "./TranslateGizmo.js";

let json: {
  meshes: {
    name: string;
    meshPath: string;
    diffuse: string;
    specular: string;
    emission: string;
    collision: boolean;
    meshCollision: boolean;
    placements: {
      translation: number[];
      rotation: number[];
      origin: number[];
      scale: number[];
      oneLineFormat: string;
    }[];
  }[];
};

class Command {
  childCommands = new Map<string, Command>();
  logic?: (args: string[]) => string;
  updatePhysics?: boolean;

  addCommand(
    commandChain: string,
    commandLogic: (args: string[]) => string,
    updatePhysics: boolean = false,
  ) {
    const commands = commandChain.split(" ").filter((part) => part.length > 0);
    if (commands.length == 0) {
      if (this.logic != undefined) {
        console.warn("Overwriting logic for console command!");
      }
      this.logic = commandLogic;
      this.updatePhysics = updatePhysics;
      return;
    }
    const identifiers = commands[0].split("/");
    for (const identifier of identifiers) {
      let remainingCommandChain = "";
      for (let i = 1; i < commands.length; i++) {
        remainingCommandChain += commands[i] + " ";
      }

      let child: Command;
      if (this.childCommands.has(identifier)) {
        child = this.childCommands.get(identifier);
      } else {
        this.childCommands.set(identifier, new Command());
      }

      this.childCommands
        .get(identifier)
        .addCommand(remainingCommandChain.trim(), commandLogic);
    }
  }

  getCommand(commandChain: string): {
    command: Command;
    remainingArgs: string;
  } {
    const commands = commandChain.split(" ").filter((part) => part.length > 0);
    if (commands.length == 0) {
      return { command: this, remainingArgs: "" };
    }

    if (!this.childCommands.has(commands[0])) {
      return { command: this, remainingArgs: commandChain };
    }

    let remainingCommandChain = "";
    for (let i = 1; i < commands.length; i++) {
      remainingCommandChain += commands[i] + " ";
    }

    return this.childCommands
      .get(commands[0])
      .getCommand(remainingCommandChain.trim());
  }

  getAutocomplete(commandChain: string): {
    complete: string;
    suggestions: string[];
  } {
    const commands = commandChain.split(" ").filter((part) => part.length > 0);
    if (commands.length == 0) {
      return {
        complete: "",
        suggestions: Array.from(this.childCommands.keys()),
      };
    }

    const matches = Array.from(this.childCommands.keys()).filter((key) =>
      key.startsWith(commands[0]),
    );

    const exactMatch = matches.find((match) => match == commands[0]);

    const endsWithSpace = commandChain.endsWith(" ");

    if (commands.length == 1) {
      // This is the last word and there's an exact match followed by a space
      if (exactMatch != undefined && endsWithSpace) {
        // Go deeper for suggestions
        let childCompleteAndSuggestion = this.childCommands
          .get(commands[0])
          .getAutocomplete("");
        childCompleteAndSuggestion.complete = commands[0] + " ";
        if (childCompleteAndSuggestion.suggestions.length == 1) {
          // There's just one suggestion, add it on
          childCompleteAndSuggestion.complete =
            commands[0] + " " + childCompleteAndSuggestion.suggestions[0] + " ";
          childCompleteAndSuggestion.suggestions.length = 0; // Clear the suggesions
        }
        return childCompleteAndSuggestion;
      }

      // Check if theres just one match
      if (matches.length == 1) {
        // It's an exact match
        if (exactMatch != undefined) {
          return { complete: exactMatch + " ", suggestions: [] };
        }

        // It's not an exact match
        if (endsWithSpace) {
          // There's one match, but it's not exact and we've already put a space, no hits!
          return { complete: "", suggestions: [] };
        }

        // It's one match, it's not exact but we also haven't put a space at the end, so it's safe to autocomplete it
        return { complete: matches[0] + " ", suggestions: [] };
      }

      // Return the match list as suggestions
      return { complete: "", suggestions: matches };
    }

    // This isn't the last word, if there's an exact match, go deeper, otherwise return empty complete and empty suggestions
    if (exactMatch != undefined) {
      let childCompleteAndSuggestion = this.childCommands
        .get(commands[0])
        .getAutocomplete(
          commandChain.trimStart().substring(commands[0].length).trimStart(),
        );

      if (childCompleteAndSuggestion.complete.length > 0) {
        childCompleteAndSuggestion.complete =
          commands[0] + " " + childCompleteAndSuggestion.complete;
      }
      return childCompleteAndSuggestion;
    }

    return { complete: "", suggestions: [] };
  }
}

let baseCommand = new Command();

export function addNewConsoleCommand(
  commandChain: string,
  commandLogic: (args: string[]) => string,
  updatePhysics: boolean = false,
) {
  baseCommand.addCommand(commandChain, commandLogic, updatePhysics);
}

export default class WorldEditor {
  private camera: Camera;
  private scene: Scene;
  physicsScene: PhysicsScene;
  internalPhysicsScene: PhysicsScene; // Will have all the objects loaded throught the world editor in it, no matter if they have collisions or not.
  private guiRenderer: GUIRenderer;
  placementsMap = new Map<
    string,
    {
      gb: GraphicsBundle;
      po: PhysicsObject;
      jsonMesh: (typeof json.meshes)[number];
      placementIndex: number;
    }[]
  >();
  private _currentlySelectedTransform: Transform = null;
  /**
   * The transform the editor commands and the gizmo act on.
   * Implemented as an accessor so that the gizmo follows the selection no
   * matter which of the many assignment sites changed it.
   */
  private get currentlySelectedTransform(): Transform {
    return this._currentlySelectedTransform;
  }
  private set currentlySelectedTransform(transform: Transform) {
    this._currentlySelectedTransform = transform;
    if (this.gizmo != undefined) {
      this.gizmo.setTarget(transform);
    }
  }
  private mousePosition = { x: 0, y: 0, previousX: 0, previousY: 0 };
  private mouseLeftHeld = false;
  private mouseRightHeld = false;
  private mouseMiddleHeld = false;
  private shiftHeld = false;
  private sensitivity = 0.2;
  private autosave = true;
  private searchMode = false;
  private searchModeSuggestions: Set<string> = new Set<string>();
  private searchModeSuggestionIndex: number = 0;

  private saveNeeded = false;
  private tHeld = false;

  private commandHistory: string[] = localStorage.getItem("commandHistory")
    ? localStorage.getItem("commandHistory").split("\n")
    : [];
  private commandHistoryIndex = 0;

  private guiDiv: Div;

  private guiElements: HTMLElement[] = [];

  gizmo: TranslateGizmo;

  constructor(
    camera: Camera,
    scene: Scene,
    physicsScene: PhysicsScene,
    guiRenderer: GUIRenderer,
  ) {
    this.camera = camera;
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.internalPhysicsScene = new PhysicsScene();
    vec3.zero(this.internalPhysicsScene.gravity);

    this.gizmo = new TranslateGizmo(camera, scene);

    this.guiRenderer = guiRenderer;

    this.guiDiv = guiRenderer.getNewDiv();
    this.guiDiv.getElement().style.width = "100%";
    this.guiDiv.getElement().style.height = "100%";
    this.guiDiv.getElement().style.zIndex = "5";

    // Add a command line
    let consoleOutput = guiRenderer.getNew2DText(this.guiDiv);
    consoleOutput.position[0] = 0.5;
    consoleOutput.position[1] = 0.85;
    consoleOutput.center = true;
    consoleOutput.getElement().style.width = "80%";
    consoleOutput.getElement().style.height = "14%";
    consoleOutput.textString = "";
    consoleOutput.getElement().style.backgroundColor = "rgba(0,0,0,0.2)";
    consoleOutput.getElement().style.overflowY = "scroll";
    consoleOutput.getElement().style.whiteSpace = "pre";
    consoleOutput.getElement().style.color = "white";

    let consoleCommandsTextEdit = guiRenderer.getNewEditText(this.guiDiv);
    consoleCommandsTextEdit.position[0] = 0.5;
    consoleCommandsTextEdit.position[1] = 0.97;
    consoleCommandsTextEdit.center = true;
    consoleCommandsTextEdit.getElement().style.width = "80%";
    consoleCommandsTextEdit.getInputElement().style.width = "100%";

    let histoySearchTextEdit = guiRenderer.getNewEditText(this.guiDiv);
    histoySearchTextEdit.position[0] = 0.5;
    histoySearchTextEdit.position[1] = 0.93;
    histoySearchTextEdit.center = true;
    histoySearchTextEdit.getElement().style.width = "80%";
    histoySearchTextEdit.getInputElement().style.width = "100%";
    histoySearchTextEdit.setHidden(true);

    this.guiElements.push(
      consoleCommandsTextEdit.getInputElement(),
      histoySearchTextEdit.getInputElement(),
    );

    let self = this;

    histoySearchTextEdit
      .getInputElement()
      .addEventListener("input", (event) => {
        if (this.searchMode) {
          self.searchHistory(
            histoySearchTextEdit,
            consoleCommandsTextEdit,
            false,
          );
        }
      });

    histoySearchTextEdit
      .getInputElement()
      .addEventListener("change", (event) => {
        if (this.searchMode) {
          histoySearchTextEdit.setHidden(true);
          consoleCommandsTextEdit.getInputElement().focus();
          self.searchMode = false;
        }
      });

    document.addEventListener("keydown", function (event) {
      if (
        event.ctrlKey &&
        (event.key == "f" || event.key == "F") &&
        (document.activeElement == consoleCommandsTextEdit.getInputElement() ||
          document.activeElement == histoySearchTextEdit.getInputElement())
      ) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (event.key == "Shift") {
        self.shiftHeld = true;
      }
      if (event.key == "Tab") {
        event.preventDefault();
      }

      if (event.key == "t" || event.key == "T") {
        self.tHeld = true;
      }
    });

    document.addEventListener("keyup", function (event) {
      if (event.key == "Shift") {
        self.shiftHeld = false;
      }

      if (event.key == "t" || event.key == "T") {
        self.tHeld = false;
        if (
          self.interacting() &&
          self.mouseLeftHeld &&
          self.saveNeeded &&
          self.autosave
        ) {
          self.save();
        }
      }

      if (
        event.key == "Escape" &&
        document.activeElement == histoySearchTextEdit.getInputElement()
      ) {
        histoySearchTextEdit.setHidden(true);
        consoleCommandsTextEdit.getInputElement().focus();
        self.searchMode = false;
      }

      if (
        event.key == "Tab" &&
        (document.activeElement == consoleCommandsTextEdit.getInputElement() ||
          document.activeElement == histoySearchTextEdit.getInputElement())
      ) {
        event.preventDefault();
        if (self.searchMode) {
          histoySearchTextEdit.setHidden(true);
          consoleCommandsTextEdit.getInputElement().focus();
          self.searchMode = false;
        } else {
          const autocompleted = self.tabComplete(
            consoleCommandsTextEdit.getInputElement().value,
          );
          if (autocompleted.complete.length > 0) {
            consoleCommandsTextEdit.getInputElement().value =
              autocompleted.complete;
          }

          if (autocompleted.suggestions.length > 0) {
            // Print the options
            consoleOutput.textString += "  ";
            for (const suggestion of autocompleted.suggestions) {
              consoleOutput.textString += suggestion + " ";
            }
            consoleOutput.textString += "\n";
            consoleOutput.scrollToBottom = true;
          }
        }
      }

      if (
        event.key == "§" &&
        document.activeElement != consoleCommandsTextEdit.getInputElement()
      ) {
        if (self.searchMode) {
          histoySearchTextEdit.setHidden(true);
          self.searchMode = false;
        }
        self.guiDiv.setHidden(false);
        consoleCommandsTextEdit.getInputElement().focus();
        document.exitPointerLock();
      }
      if (
        event.key == "ArrowUp" &&
        consoleCommandsTextEdit.getInputElement() == document.activeElement &&
        self.commandHistory.length > 0
      ) {
        self.commandHistoryIndex = Math.min(
          self.commandHistory.length,
          ++self.commandHistoryIndex,
        );
        consoleCommandsTextEdit.getInputElement().value =
          self.commandHistory[
            self.commandHistory.length - self.commandHistoryIndex
          ];
        self.searchMode = false;
      }
      if (
        event.key == "ArrowDown" &&
        consoleCommandsTextEdit.getInputElement() == document.activeElement &&
        self.commandHistory.length > 0
      ) {
        self.commandHistoryIndex = Math.max(0, --self.commandHistoryIndex);
        if (self.commandHistoryIndex == 0) {
          consoleCommandsTextEdit.getInputElement().value = "";
        } else {
          consoleCommandsTextEdit.getInputElement().value =
            self.commandHistory[
              self.commandHistory.length - self.commandHistoryIndex
            ];
        }
        self.searchMode = false;
      }
      if (
        event.key == "Enter" &&
        consoleCommandsTextEdit.getInputElement() == document.activeElement
      ) {
        self.parseConsoleInput(
          consoleCommandsTextEdit.getInputElement().value,
          consoleOutput,
        );
        consoleCommandsTextEdit.getInputElement().value = "";
        consoleOutput.scrollToBottom = true;
        self.commandHistoryIndex = 0;
        self.searchMode = false;
      }

      if (
        event.ctrlKey &&
        (event.key == "f" || event.key == "F") &&
        (document.activeElement == consoleCommandsTextEdit.getInputElement() ||
          document.activeElement == histoySearchTextEdit.getInputElement())
      ) {
        event.preventDefault();
        event.stopPropagation();

        // Search history
        if (!self.searchMode) {
          histoySearchTextEdit.setHidden(false);
          histoySearchTextEdit.getInputElement().focus();
          histoySearchTextEdit.getInputElement().value = "";
          self.searchMode = true;
        } else {
          self.searchHistory(histoySearchTextEdit, consoleCommandsTextEdit);
        }
      }
    });

    document.addEventListener("mousemove", function (event) {
      self.mousePosition.previousX = self.mousePosition.x;
      self.mousePosition.previousY = self.mousePosition.y;
      self.mousePosition.x = event.clientX;
      self.mousePosition.y = event.clientY;
      if (self.interacting()) {
        if (self.gizmo.isDragging()) {
          // Shift snaps to the grid step while dragging a handle.
          if (
            self.gizmo.updateDrag(
              vec2.fromValues(self.mousePosition.x, self.mousePosition.y),
              self.shiftHeld,
            )
          ) {
            self.internalPhysicsScene.update(0.0, true, false);
            self.saveNeeded = true;
          }
          return;
        }

        self.gizmo.updateHover(
          vec2.fromValues(self.mousePosition.x, self.mousePosition.y),
        );

        if (!self.shiftHeld && (self.mouseMiddleHeld || self.mouseRightHeld)) {
          let pitchJaw = self.camera.getPitchJawDegrees();
          vec2.scaleAndAdd(
            pitchJaw,
            pitchJaw,
            vec2.fromValues(
              self.mousePosition.y - self.mousePosition.previousY,
              self.mousePosition.x - self.mousePosition.previousX,
            ),
            -self.sensitivity,
          );
          self.camera.setPitchJawDegrees(pitchJaw[0], pitchJaw[1]);
        } else if (self.mouseMiddleHeld || self.mouseRightHeld) {
          let camPos = vec3.clone(self.camera.getPosition());
          vec3.scaleAndAdd(
            camPos,
            camPos,
            self.camera.getRight(),
            -(self.mousePosition.x - self.mousePosition.previousX) * 0.02,
          );
          vec3.scaleAndAdd(
            camPos,
            camPos,
            self.camera.getUp(),
            (self.mousePosition.y - self.mousePosition.previousY) * 0.02,
          );
          self.camera.setPosition(camPos);
        }

        if (
          document.activeElement != consoleCommandsTextEdit.getInputElement() &&
          document.activeElement != histoySearchTextEdit.getInputElement()
        ) {
          if (self.tHeld && self.mouseLeftHeld) {
            self.placeFromRayIntersection();
          }
        }
      }
    });

    document.addEventListener("mousedown", (event) => {
      if (event.button == 0) {
        self.mouseLeftHeld = true;
        if (self.interacting()) {
          // The gizmo gets first refusal on the click, so grabbing a handle
          // never doubles as a reselect or a hold T placement.
          if (
            self.gizmo.startDrag(
              vec2.fromValues(self.mousePosition.x, self.mousePosition.y),
            )
          ) {
            // Handle grabbed, nothing else should act on this click.
          } else if (self.tHeld) {
            self.placeFromRayIntersection();
          }
        }
      }
      if (event.button == 1) {
        self.mouseMiddleHeld = true;
      }
      if (event.button == 2) {
        self.mouseRightHeld = true;
      }
    });

    document.addEventListener("mouseup", (event) => {
      if (event.button == 0) {
        self.mouseLeftHeld = false;
        if (self.interacting()) {
          if (self.gizmo.isDragging()) {
            self.gizmo.endDrag();
            if (self.saveNeeded && self.autosave) {
              self.save();
            }
          } else if (self.tHeld) {
            if (self.saveNeeded && self.autosave) {
              self.save();
            }
          } else {
            self.selectFromRayIntersection(consoleOutput);
          }
        }
      }
      if (event.button == 1) {
        self.mouseMiddleHeld = false;
      }
      if (event.button == 2) {
        self.mouseRightHeld = false;
      }
    });

    document.addEventListener("wheel", (event) => {
      if (self.interacting()) {
        let camPos = vec3.clone(self.camera.getPosition());
        vec3.scaleAndAdd(
          camPos,
          camPos,
          self.camera.getDir(),
          -event.deltaY * 0.01,
        );
        self.camera.setPosition(camPos);
      }
    });

    let testButton = guiRenderer.getNewButton(this.guiDiv);
    testButton.textString = "testButtonLol";
    this.guiElements.push(testButton.getInputElement());
    testButton.onClick(() => {
      testButton.getInputElement().focus();
      consoleOutput.textString += "Button clicked\n";
    });

    addNewConsoleCommand(
      "rotate x/y/z",
      (args: string[]): string => {
        const index = ["x", "y", "z"].findIndex((string) => {
          return string == args[1];
        });
        if (index != -1) {
          let degrees = parseFloat(args[2]);
          if (isNaN(degrees)) {
            return "Argument is not a number, please input a number instead.";
          }
          let rotChange = vec3.create();
          rotChange[index] = degrees;
          if (self.currentlySelectedTransform == undefined) {
            return "No object selected for modification";
          }
          quat.mul(
            self.currentlySelectedTransform.rotation,
            self.currentlySelectedTransform.rotation,
            quat.fromEuler(
              quat.create(),
              rotChange[0],
              rotChange[1],
              rotChange[2],
            ),
          );
          return "Successfully rotated";
        }
        return "Failed to rotate";
      },
      true,
    );

    addNewConsoleCommand(
      "translate/move x/y/z",
      (args: string[]): string => {
        const index = ["x", "y", "z"].findIndex((string) => {
          return string == args[1];
        });
        if (index != -1) {
          let floatVal = parseFloat(args[2]);
          if (isNaN(floatVal)) {
            return "Argument is not a number, please input a number instead.";
          }
          let translationChange = vec3.create();
          translationChange[index] = floatVal;
          if (self.currentlySelectedTransform == undefined) {
            return "No object selected for modification";
          }
          vec3.add(
            self.currentlySelectedTransform.position,
            self.currentlySelectedTransform.position,
            translationChange,
          );
          return "Successfully translated";
        }
        return "Failed to translate";
      },
      true,
    );

    addNewConsoleCommand(
      "scale x/y/z",
      (args: string[]): string => {
        const index = ["x", "y", "z"].findIndex((string) => {
          return string == args[1];
        });
        if (index != -1) {
          let floatVal = parseFloat(args[2]);
          if (isNaN(floatVal)) {
            return "Argument is not a number, please input a number instead.";
          }
          let scaleChange = vec3.create();
          scaleChange[index] = floatVal;
          if (self.currentlySelectedTransform == undefined) {
            return "No object selected for modification";
          }
          vec3.add(
            self.currentlySelectedTransform.scale,
            self.currentlySelectedTransform.scale,
            scaleChange,
          );
          return "Successfully scaled";
        }
        return "Failed to scale";
      },
      true,
    );

    addNewConsoleCommand(
      "origin x/y/z",
      (args: string[]): string => {
        const index = ["x", "y", "z"].findIndex((string) => {
          return string == args[1];
        });
        if (index != -1) {
          let floatVal = parseFloat(args[2]);
          if (isNaN(floatVal)) {
            return "Argument is not a number, please input a number instead.";
          }
          let originChange = vec3.create();
          originChange[index] = floatVal;
          if (self.currentlySelectedTransform == undefined) {
            return "No object selected for modification";
          }
          vec3.add(
            self.currentlySelectedTransform.origin,
            self.currentlySelectedTransform.origin,
            originChange,
          );
          return "Successfully updated origin";
        }
        return "Failed to change origin";
      },
      true,
    );

    addNewConsoleCommand("exit", (args: string[]): string => {
      self.guiDiv.setHidden(true);
      return "exited";
    });

    addNewConsoleCommand("toggle cullingboxes", (args: string[]): string => {
      (self.scene.renderer as Renderer3D).showCullingShapes = !(
        self.scene.renderer as Renderer3D
      ).showCullingShapes;
      return "Toggled cullingboxes";
    });

    addNewConsoleCommand("set sensitivity", (args: string[]): string => {
      let sensitivity = parseFloat(args[2]);
      if (isNaN(sensitivity)) {
        return "Failed setting sensitivity, argument is not a number";
      }
      self.sensitivity = sensitivity;
      return "Set sensitivity to " + self.sensitivity;
    });

    addNewConsoleCommand("set autosave", (args: string[]): string => {
      self.autosave = args[2] === "true";
      if (self.autosave) {
        return "Autosave on";
      }
      return "Autosave off";
    });

    addNewConsoleCommand("get sensitivity", (args: string[]): string => {
      return "" + self.sensitivity;
    });

    addNewConsoleCommand("get autosave", (args: string[]): string => {
      return "" + self.autosave;
    });

    addNewConsoleCommand("save", (args: string[]): string => {
      self.save();
      return "Saved to clipboard";
    });

    // this.tabCompleteUnitTest();

    this.guiDiv.setHidden(true);
  }

  setEnabled(enabled: boolean) {
    this.guiDiv.setHidden(!enabled);
  }

  /**
   * Rebuilds the gizmo geometry. Call once per frame before rendering, from
   * preRenderingUpdate. The gizmo is scaled to keep a constant size on screen,
   * so its geometry depends on the current camera position and has to be
   * refreshed every frame rather than only when the selection changes.
   */
  preRenderingUpdate() {
    // Only show the gizmo while the editor is actually open.
    if (!this.interacting()) {
      this.gizmo.setTarget(null);
    } else if (this.gizmo.getTarget() != this.currentlySelectedTransform) {
      this.gizmo.setTarget(this.currentlySelectedTransform);
    }

    this.gizmo.updateGeometry();
  }

  interacting(): boolean {
    // return this.guiElements.findIndex((element) => {return element == document.activeElement}) > -1;
    return !this.guiDiv.getHidden();
  }

  searchHistory(
    histoySearchTextEdit: EditText,
    consoleCommandsTextEdit: EditText,
    tickUpIndex: boolean = true,
  ) {
    let previousResults = new Set<string>(this.searchModeSuggestions); // Copy
    this.searchModeSuggestions = new Set<string>(
      this.commandHistory.filter((command) =>
        command.startsWith(histoySearchTextEdit.getInputElement().value),
      ),
    );

    let same = false;

    if (previousResults.size == this.searchModeSuggestions.size) {
      same = true;
      for (let entry of previousResults) {
        if (!this.searchModeSuggestions.has(entry)) {
          same = false;
          break;
        }
      }
    }

    if (!same) {
      this.searchModeSuggestionIndex = 0;
    } else if (tickUpIndex) {
      this.searchModeSuggestionIndex++;
      if (this.searchModeSuggestionIndex >= this.searchModeSuggestions.size) {
        this.searchModeSuggestionIndex = 0;
      }
    }

    let asd = [...this.searchModeSuggestions][this.searchModeSuggestionIndex];
    if (asd == undefined) {
      asd = "";
    }

    consoleCommandsTextEdit.getInputElement().value = asd;
  }

  private tabCompleteUnitTest() {
    let self = this;
    addNewConsoleCommand("toggle cullingboxes", (args: string[]): string => {
      (self.scene.renderer as Renderer3D).showCullingShapes = !(
        self.scene.renderer as Renderer3D
      ).showCullingShapes;
      return "Toggled cullingboxes";
    });

    addNewConsoleCommand(
      "r/rot/rotate x/y/z",
      (args: string[]): string => {
        const index = ["x", "y", "z"].findIndex((string) => {
          return string == args[1];
        });
        if (index != -1) {
          let degrees = parseFloat(args[2]);
          if (isNaN(degrees)) {
            return "Argument is not a number, please input a number instead.";
          }
          let rotChange = vec3.create();
          rotChange[index] = degrees;
          if (self.currentlySelectedTransform == undefined) {
            return "No object selected for modification";
          }
          quat.add(
            self.currentlySelectedTransform.rotation,
            self.currentlySelectedTransform.rotation,
            quat.fromEuler(
              quat.create(),
              rotChange[0],
              rotChange[1],
              rotChange[2],
            ),
          );
          return "Successfully rotated";
        }
        return "Failed to rotate";
      },
      true,
    );

    addNewConsoleCommand("this is a test command", (args: string[]): string => {
      return "this is a test command";
    });

    addNewConsoleCommand(
      "this is another test command",
      (args: string[]): string => {
        return "this is another test command";
      },
    );

    const tests: { input: string; complete: string; suggestions: string[] }[] =
      [
        {
          input: "toggle c",
          complete: "toggle cullingboxes ",
          suggestions: [],
        },
        {
          input: "tog",
          complete: "toggle ",
          suggestions: [],
        },
        {
          input: "toggle a",
          complete: "",
          suggestions: [],
        },
        {
          input: "toggle",
          complete: "toggle ",
          suggestions: [],
        },
        {
          input: "toggle ",
          complete: "toggle cullingboxes ",
          suggestions: [],
        },
        {
          input: "rot",
          complete: "",
          suggestions: ["rot", "rotate"],
        },
        {
          input: "rot ",
          complete: "rot ",
          suggestions: ["x", "y", "z"],
        },
        {
          input: "rot x",
          complete: "rot x ",
          suggestions: [],
        },
        {
          input: "rot x ",
          complete: "rot x ",
          suggestions: [],
        },
        {
          input: "this is a",
          complete: "",
          suggestions: ["a", "another"],
        },
        {
          input: "this is a ",
          complete: "this is a test ",
          suggestions: [],
        },
        {
          input: "this is an",
          complete: "this is another ",
          suggestions: [],
        },
        {
          input: "this is an ",
          complete: "",
          suggestions: [],
        },
      ];

    for (const test of tests) {
      const output = this.tabComplete(test.input);
      if (output.complete != test.complete) {
        debugger;
      }
      if (output.suggestions.length != test.suggestions.length) {
        debugger;
      }
      if (output.suggestions.length == 0) {
        continue;
      }
      test.suggestions.sort();
      output.suggestions.sort();
      for (let i = 0; i < test.suggestions.length; i++) {
        if (test.suggestions[i] != output.suggestions[i]) {
          debugger;
        }
      }
    }
  }

  placeFromRayIntersection() {
    if (this.currentlySelectedTransform == undefined) {
      return;
    }

    let currentlySelectedPhysicObject =
      this.internalPhysicsScene.physicsObjects.find((physicsObject) => {
        return physicsObject.transform == this.currentlySelectedTransform;
      });
    let wasCollidable = false;
    if (currentlySelectedPhysicObject != undefined) {
      wasCollidable = currentlySelectedPhysicObject.isCollidable;
      currentlySelectedPhysicObject.isCollidable = false;
    }

    const hitPosition = MousePicking.GetRayHitPosition(
      this.camera,
      this.scene.renderer,
      vec2.fromValues(this.mousePosition.x, this.mousePosition.y),
      this.internalPhysicsScene,
    );

    if (hitPosition) {
      this.currentlySelectedTransform.setTranslation(hitPosition);
    }

    if (currentlySelectedPhysicObject != undefined) {
      currentlySelectedPhysicObject.isCollidable = wasCollidable;
    }

    this.internalPhysicsScene.update(0.0, true, false);

    this.saveNeeded = true;
  }

  getObjectFromRayIntersection(ndc: vec2): {
    name: string;
    graphicsBundle: GraphicsBundle;
    hit: { distance: number; object: PhysicsObject };
  } {
    const ray = MousePicking.GetRay(this.camera, ndc);
    const hit = this.internalPhysicsScene.doRayCast(ray, true);

    if (hit.object == undefined) {
      return null;
    } else {
      let name = "unknown";
      let gb = null;
      for (let entry of this.placementsMap) {
        for (let placement of entry[1]) {
          if (
            placement.po != undefined &&
            placement.po.physicsObjectId == hit.object.physicsObjectId
          ) {
            name = entry[0];
            gb = placement.gb;
            break;
          }
        }
        if (name != "unknown") {
          break;
        }
      }
      return { name: name, graphicsBundle: gb, hit: hit };
    }
  }

  selectFromRayIntersection(consoleOutput: TextObject2D) {
    const hit = MousePicking.GetRayHit(
      this.camera,
      this.scene.renderer,
      vec2.fromValues(this.mousePosition.x, this.mousePosition.y),
      this.internalPhysicsScene,
    );
    if (hit.object == undefined) {
      this.currentlySelectedTransform = null;
      consoleOutput.textString += "Selected nothing \n";
      this.scene.cullingShapeTransformsToMarkAsGreen.length = 0;
    } else {
      this.currentlySelectedTransform = hit.object.transform;
      this.scene.cullingShapeTransformsToMarkAsGreen.length = 0;
      this.scene.cullingShapeTransformsToMarkAsGreen.push(hit.object.transform);

      let name = "unknown";
      for (let entry of this.placementsMap) {
        for (let placement of entry[1]) {
          if (
            placement.po != undefined &&
            placement.po.physicsObjectId == hit.object.physicsObjectId
          ) {
            name = entry[0];
            break;
          }
        }
        if (name != "unknown") {
          break;
        }
      }

      consoleOutput.textString += "Selected new object " + name + "\n";
    }
    consoleOutput.scrollToBottom = true;
  }

  setSelectedTransform(transform: Transform) {
    this.currentlySelectedTransform = transform;
  }

  private tabComplete(input: string): {
    complete: string;
    suggestions: string[];
  } {
    return baseCommand.getAutocomplete(input);
  }

  private parseConsoleInput(input: string, consoleOutput: TextObject2D) {
    if (input.length > 0) {
      consoleOutput.textString += "> " + input + "\n";
      this.commandHistory.push(input);
      localStorage.setItem("commandHistory", this.commandHistory.join("\n"));
    }

    let command = baseCommand.getCommand(input);

    if (command.command.logic == undefined) {
      return;
    }

    let self = this;

    let returnString = command.command.logic(
      input.split(" ").filter((arg) => arg.length > 0),
    );

    consoleOutput.textString += returnString + "\n";
    if (command.command.updatePhysics) {
      this.physicsScene.update(0.0, true, false);
      if (self.autosave) {
        self.save();
        consoleOutput.textString += "Saved to clipboard \n";
      }
    }
  }

  async loadWorld(path: string) {
    let placements = await fetch(path);
    json = await placements.json();

    if (json.meshes != undefined) {
      for (const mesh of json.meshes) {
        if (this.placementsMap.has(mesh.name)) {
          throw (
            'Tried to load meshes with duplicate name "' +
            mesh.name +
            '" from ' +
            path +
            "."
          );
        }
        this.placementsMap.set(mesh.name, []);
        for (let i = 0; i < mesh.placements.length; i++) {
          const placement = mesh.placements[i];
          const bundle =
            mesh.meshPath.endsWith("glb") || mesh.meshPath.endsWith("gltf")
              ? this.scene.addNewAnimatedMesh(
                  mesh.meshPath,
                  mesh.diffuse,
                  mesh.specular,
                  true,
                )
              : this.scene.addNewMesh(
                  mesh.meshPath,
                  mesh.diffuse,
                  mesh.specular,
                  false,
                );

          if (this.currentlySelectedTransform == null) {
            this.currentlySelectedTransform = bundle.transform;
          }

          const index =
            this.placementsMap.get(mesh.name).push({
              gb: bundle,
              po: null,
              jsonMesh: mesh,
              placementIndex: i,
            }) - 1;
          let placementsMapEntry = this.placementsMap.get(mesh.name)[index];

          if (mesh.emission != undefined && mesh.emission.length > 0) {
            bundle.emission = this.scene.renderer.textureStore.getTexture(
              mesh.emission,
            );
          }
          let translation = placement.translation;
          let scale = placement.scale;
          let rotation = placement.rotation;
          let origin = placement.origin;

          // If there's a oneLineFormat, use that
          if (
            placement.oneLineFormat != undefined &&
            placement.oneLineFormat.length > 0
          ) {
            let [p, s, r, o] = placement.oneLineFormat.split("|");
            translation = p.split(",").map((n: string) => parseFloat(n));
            scale = s.split(",").map((n: string) => parseFloat(n));
            rotation = r.split(",").map((n: string) => parseFloat(n));
            origin = o.split(",").map((n: string) => parseFloat(n));
          }

          if (translation != undefined && translation.length == 3) {
            vec3.set(
              bundle.transform.position,
              translation[0],
              translation[1],
              translation[2],
            );
          }
          if (scale != undefined && scale.length == 3) {
            vec3.set(bundle.transform.scale, scale[0], scale[1], scale[2]);
          }
          if (origin != undefined && origin.length == 3) {
            vec3.set(bundle.transform.origin, origin[0], origin[1], origin[2]);
          }
          if (rotation != undefined && rotation.length == 3) {
            quat.fromEuler(
              bundle.transform.rotation,
              rotation[0],
              rotation[1],
              rotation[2],
            );
          } else if (rotation != undefined && rotation.length == 4) {
            quat.set(
              bundle.transform.rotation,
              rotation[0],
              rotation[1],
              rotation[2],
              rotation[3],
            );
          }

          const physicsObject = this.internalPhysicsScene.addNewPhysicsObject(
            bundle.transform,
          );
          placementsMapEntry.po = physicsObject;
          physicsObject.setupBoundingBoxFromGraphicsBundle(bundle);
          physicsObject.isStatic = true;

          if (mesh.meshCollision) {
            physicsObject.setupInternalTreeFromGraphicsObject(
              bundle.graphicsObject,
              mesh.meshPath,
            );
          }

          if (mesh.collision) {
            // this.scene.addNewShape(physicsObject.boundingBox);
            this.physicsScene.addNewPhysicsObject(null, physicsObject);
          }
        }
      }

      this.internalPhysicsScene.update(0.0, true, false);
      this.physicsScene.update(0.0, true, false);
    }
  }

  async save() {
    this.saveNeeded = false;
    for (let entry of this.placementsMap) {
      for (let placement of entry[1]) {
        placement.jsonMesh.placements[placement.placementIndex].oneLineFormat =
          null;
        placement.jsonMesh.placements[placement.placementIndex].translation =
          placement.gb.transform.position as Array<number>;
        placement.jsonMesh.placements[placement.placementIndex].rotation =
          placement.gb.transform.rotation as Array<number>;
        placement.jsonMesh.placements[placement.placementIndex].scale =
          placement.gb.transform.scale as Array<number>;
        placement.jsonMesh.placements[placement.placementIndex].origin =
          placement.gb.transform.origin as Array<number>;
      }
    }

    const type = "text/plain";
    const clipboardItemData = {
      [type]: JSON.stringify(json),
    };
    const clipboardItem = new ClipboardItem(clipboardItemData);
    await navigator.clipboard.write([clipboardItem]);
  }
}
