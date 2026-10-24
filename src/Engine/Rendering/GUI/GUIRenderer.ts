import Camera from "../Objects/Camera.js";
import Button from "./Objects/Button.js";
import Checkbox from "./Objects/Checkbox.js";
import Div from "./Objects/Div.js";
import GuiObject from "./Objects/GuiObject.js";
import Progress from "./Objects/Progress.js";
import Slider from "./Objects/Slider.js";
import EditText from "./Objects/Text/EditText.js";
import TextObject2D from "./Objects/Text/TextObject2D.js";
import TextObject3D from "./Objects/Text/TextObject3D.js";

export class GUIRenderer {
  // ---- GUI rendering ----
  private guiObjects3D: Array<TextObject3D>;
  private guiObjects2D: Array<GuiObject>;
  // -----------------------

  domElement: HTMLDivElement;

  constructor() {
    // ---- GUI rendering ----
    this.guiObjects3D = new Array<TextObject3D>();
    this.guiObjects2D = new Array<GuiObject>();
    // -----------------------

    this.domElement = document.createElement("div");
    this.domElement.style.overflow = "hidden";
  }

  setSize(width: number, height: number) {
    this.domElement.style.width = width + "px";
    this.domElement.style.height = height + "px";
  }

  clear() {
    for (let guiObject2D of this.guiObjects2D) {
      guiObject2D.remove();
    }

    for (let guiObject3D of this.guiObjects3D) {
      guiObject3D.remove();
    }
  }

  hide() {
    for (let guiObject2D of this.guiObjects2D) {
      if (!guiObject2D.hasParent) {
        // Only change top level objects
        guiObject2D.setHidden(true);
      }
    }

    for (let guiObject3D of this.guiObjects3D) {
      guiObject3D.setHidden(true);
    }
  }

  show() {
    for (let guiObject2D of this.guiObjects2D) {
      if (!guiObject2D.hasParent) {
        // Only change top level objects
        guiObject2D.setHidden(false);
      }
    }

    for (let guiObject3D of this.guiObjects3D) {
      guiObject3D.setHidden(false);
    }
  }

  getNew3DText(parentDiv?: Div): TextObject3D {
    const length = this.guiObjects3D.push(
      new TextObject3D(this.domElement, parentDiv),
    );
    return this.guiObjects3D[length - 1];
  }

  getNew2DText(parentDiv?: Div): TextObject2D {
    const length = this.guiObjects2D.push(
      new TextObject2D(this.domElement, parentDiv),
    );
    return this.guiObjects2D[length - 1] as TextObject2D;
  }

  getNewCheckbox(parentDiv?: Div): Checkbox {
    const length = this.guiObjects2D.push(
      new Checkbox(this.domElement, parentDiv),
    );
    return this.guiObjects2D[length - 1] as Checkbox;
  }

  getNewButton(parentDiv?: Div): Button {
    const length = this.guiObjects2D.push(
      new Button(this.domElement, parentDiv),
    );
    return this.guiObjects2D[length - 1] as Button;
  }

  getNewSlider(parentDiv?: Div): Slider {
    const length = this.guiObjects2D.push(
      new Slider(this.domElement, parentDiv),
    );
    return this.guiObjects2D[length - 1] as Slider;
  }

  getNewEditText(parentDiv?: Div): EditText {
    const length = this.guiObjects2D.push(
      new EditText(this.domElement, parentDiv),
    );
    return this.guiObjects2D[length - 1] as EditText;
  }

  getNewProgress(parentDiv?: Div): Progress {
    const length = this.guiObjects2D.push(
      new Progress(this.domElement, parentDiv),
    );
    return this.guiObjects2D[length - 1] as Progress;
  }

  getNewDiv(parentDiv?: Div): Div {
    const length = this.guiObjects2D.push(new Div(this.domElement, parentDiv));
    return this.guiObjects2D[length - 1] as Div;
  }

  draw(camera?: Camera) {
    // ---- GUI rendering ----
    if (camera != undefined) {
      for (let i = 0; i < this.guiObjects3D.length; i++) {
        if (!this.guiObjects3D[i].removed) {
          this.guiObjects3D[i].draw3D(camera.getViewProjMatrix());
        } else {
          this.guiObjects3D.splice(i, 1);
          i--;
        }
      }
    }

    for (let i = 0; i < this.guiObjects2D.length; i++) {
      if (!this.guiObjects2D[i].removed) {
        this.guiObjects2D[i].draw();
      } else {
        this.guiObjects2D.splice(i, 1);
        i--;
      }
    }
    // -----------------------
  }
}
