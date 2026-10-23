import { vec2 } from "gl-matrix";
import Div from "./Div.js";
import GuiObject from "./GuiObject.js";

export default class Slider extends GuiObject {
  position: vec2;
  textSize: number;

  private inputNode: HTMLInputElement;
  private label: HTMLLabelElement;

  private onChangeFunction: (this: HTMLInputElement, ev: Event) => any;

  constructor(domElement: HTMLDivElement, parentDiv?: Div) {
    super(domElement, parentDiv);
    this.position = vec2.create();
    this.textSize = 42;

    // make an input node and a label node
    this.inputNode = document.createElement("input");
    this.inputNode.type = "range";
    this.inputNode.className = "slider";

    this.label = document.createElement("label");
    this.label.textContent = this.textString;
    this.label.className = "sliderLabel";

    this.div.appendChild(this.label);
    this.div.appendChild(this.inputNode);
  }

  getElement(): HTMLDivElement {
    return this.div;
  }

  getInputElement(): HTMLInputElement {
    return this.inputNode;
  }

  getValue(): number {
    return Number(this.inputNode.value);
  }

  onChange(fn: (this: HTMLInputElement, ev: Event) => any) {
    this.onChangeFunction = fn;
    this.inputNode.addEventListener("change", this.onChangeFunction);
  }

  remove(): void {
    if (this.onChangeFunction != undefined) {
      this.inputNode.removeEventListener("change", this.onChangeFunction);
    }
    super.remove();
  }

  draw() {
    this.position2D = this.position;
    this.fontSize = this.textSize;
    this.label.textContent = this.textString;
    super.drawObject();
  }
}
