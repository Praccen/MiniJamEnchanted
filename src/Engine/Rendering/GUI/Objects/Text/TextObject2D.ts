import { vec2 } from "gl-matrix";
import Div from "../Div.js";
import GuiObject from "../GuiObject.js";

export default class TextObject2D extends GuiObject {
  position: vec2;
  size: number;

  constructor(domElement: HTMLDivElement, parentDiv?: Div) {
    super(domElement, parentDiv);

    this.position = vec2.create();
    this.size = 42;
  }

  draw(): void {
    this.position2D = this.position;
    this.fontSize = this.size;
    if (this.textString.length > 0) {
      this.div.textContent = this.textString;
    }
    this.drawObject();
  }
}
