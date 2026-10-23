import {
  Div,
  GUIRenderer,
  TextObject2D,
  vec2,
  EditText,
} from "praccen-web-engine";

export default class Menu {
  guiRenderer: GUIRenderer;
  mainMenuDiv: Div;
  replayMenuDiv: Div;

  seedInput: EditText;
  startGame: boolean;

  constructor() {
    // Create a GUI renderer and attach it to the document body
    this.guiRenderer = new GUIRenderer();
    document.body.appendChild(this.guiRenderer.domElement);

    // Set the class to apply style defined in index.css
    this.guiRenderer.domElement.className = "guiContainer";

    this.mainMenuDiv = this.guiRenderer.getNewDiv();
    this.mainMenuDiv.getElement().style.position = "absolute";
    this.mainMenuDiv.getElement().style.width = "100%";
    this.mainMenuDiv.getElement().style.height = "100%";

    this.mainMenuDiv.getElement().style.background = "rgb(0, 0, 0)";

    let mainMenuText = this.guiRenderer.getNew2DText(this.mainMenuDiv);
    mainMenuText.textString = "Main menu";
    mainMenuText.getElement().style.color = "#fff";
    vec2.set(mainMenuText.position, 0.5, 0.2);
    mainMenuText.scaleWithWindow = true;
    mainMenuText.center = true;

    let self = this;

    let startBtn = this.guiRenderer.getNewButton(this.mainMenuDiv);
    startBtn.textString = "Start";
    vec2.set(startBtn.position, 0.5, 0.4);
    startBtn.scaleWithWindow = true;
    startBtn.center = true;

    startBtn.onClick(() => {
      self.startGame = true;
    });

    this.seedInput = this.guiRenderer.getNewEditText(this.mainMenuDiv);
    this.seedInput.textString = "Game Seed:";
    this.seedInput.getElement().style.color = "#fff";
    vec2.set(this.seedInput.position, 0.5, 0.6);
    this.seedInput.scaleWithWindow = true;
    this.seedInput.center = true;
    this.seedInput.getInputElement().value = "testSeed3";
  }

  destroy() {
    try {
      document.body.removeChild(this.guiRenderer.domElement);
    } catch (e) {}
  }

  draw() {
    this.guiRenderer.draw(null);
  }
}
