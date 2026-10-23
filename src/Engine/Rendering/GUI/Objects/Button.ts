import { vec2 } from "gl-matrix";
import Div from "./Div.js";
import GuiObject from "./GuiObject.js";

export default class Button extends GuiObject {
  position: vec2;
  textSize: number;

  private inputNode: HTMLButtonElement;
  private onClickFunction: (this: HTMLButtonElement, ev: MouseEvent) => any;

  constructor(domElement: HTMLDivElement, parentDiv?: Div) {
    super(domElement, parentDiv);
    this.position = vec2.create();
    this.textSize = 42;

    // make an input node and a label node
    this.inputNode = document.createElement("button");
    this.inputNode.type = "button";
    this.inputNode.className = "button";

    this.div.appendChild(this.inputNode);
  }

  getElement(): HTMLDivElement {
    return this.div;
  }

  getInputElement(): HTMLButtonElement {
    return this.inputNode;
  }

  onClick(fn: (this: HTMLButtonElement, ev: MouseEvent) => any) {
    this.onClickFunction = fn;
    this.inputNode.addEventListener("click", this.onClickFunction);
  }

  remove(): void {
    if (this.onClickFunction != undefined) {
      this.inputNode.removeEventListener("click", this.onClickFunction);
    }
    super.remove();
  }

  draw() {
    this.position2D = this.position;
    this.fontSize = this.textSize;

    if (this.textString.length > 0) {
      this.inputNode.innerText = this.textString;
    }

    this.drawObject();
  }
}
