import {
  GUIRenderer,
  TextObject2D,
  TextObject3D,
  Div,
} from "praccen-web-engine";

export default class GameGUI {
  gameGuiDiv: Div;
  mapDisplay: TextObject3D;
  characterDisplay: TextObject3D;
  floorDisplay: TextObject2D;
  constructor(guiRenderer: GUIRenderer) {
    this.gameGuiDiv = guiRenderer.getNewDiv();
    this.gameGuiDiv.getElement().style.width = "100%";
    this.gameGuiDiv.getElement().style.height = "100%";

    // Add floor display
    this.floorDisplay = guiRenderer.getNew2DText(this.gameGuiDiv);
    this.floorDisplay.position[0] = 0.91;
    this.floorDisplay.position[1] = 0.92;
    this.floorDisplay.getElement().style.color = "white";
    this.floorDisplay.textString = "Floor 1";
    this.floorDisplay.getElement().style.zIndex = "1";
  }
}
