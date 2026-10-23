import { vec2 } from "gl-matrix";
import Div from "./Div.js";

export default class GuiObject {
  protected position2D: vec2;
  protected fontSize: number;
  scaleWithWindow: boolean;
  textString: string;
  center: boolean;
  transformString: string;
  scrollToBottom = false;

  ignoreEngineModifiers: boolean;

  removed: boolean;

  private domElement: HTMLElement;
  protected div: HTMLDivElement;

  readonly hasParent: boolean;

  constructor(domElement: HTMLDivElement, parentDiv?: Div) {
    this.removed = false;
    this.position2D = vec2.create();
    this.fontSize = 42;
    this.scaleWithWindow = true;
    this.textString = "";
    this.center = false;
    this.transformString = "";

    this.ignoreEngineModifiers = false;

    this.domElement = domElement;

    // make the div
    this.div = document.createElement("div");
    this.div.style.position = "absolute";
    this.div.style.width = "fit-content";
    this.div.style.height = "fit-content";
    this.div.style.userSelect = "none";

    if (parentDiv != undefined) {
      parentDiv.appendChild(this);
      this.hasParent = true;
    } else {
      // add it to the domElement
      domElement.appendChild(this.div);
      this.hasParent = false;
    }
  }

  getElement(): HTMLDivElement {
    return this.div;
  }

  getHidden(): boolean {
    return this.div.hidden === true;
  }

  setHidden(hidden: boolean) {
    this.div.hidden = hidden;
  }

  toggleHidden(): boolean {
    this.div.hidden = !this.div.hidden;
    return this.div.hidden;
  }

  remove() {
    this.div.remove();
    this.removed = true;
  }

  protected drawObject() {
    if (this.ignoreEngineModifiers) {
      return;
    }

    this.div.style.left = this.position2D[0] * 100 + "%";
    this.div.style.top = this.position2D[1] * 100 + "%";
    if (this.scaleWithWindow) {
      this.div.style.fontSize =
        this.fontSize * (this.domElement.clientHeight / 1080.0) + "px";
    } else {
      this.div.style.fontSize = this.fontSize + "px";
    }

    if (this.transformString != "") {
      this.div.style.transform = this.transformString;
    } else if (this.center) {
      this.div.style.transform = "translate(-50%,-50%)";
    }

    if (this.scrollToBottom) {
      this.div.scrollTop = this.div.scrollHeight;
      this.scrollToBottom = false;
    }
  }

  draw() {}
}
