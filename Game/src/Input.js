class InputHandler {
  constructor() {
    this.keys = [];
    this.buttons = new Map();
    this.gamepads = new Array();
    this.mousePosition = { x: 0, y: 0, previousX: 0, previousY: 0 };
    this.mouseClicked = false;
    this.mouseRightClicked = false;

    this.mouseMovementSinceLast = [0, 0];

    this.simulateTouchBasedOnMouse = false;

    this.touchUsed = false;

    //----Controls----
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values <-- for key codes
    let self = this;
    document.addEventListener("keydown", function (event) {
      self.keys[event.key.toUpperCase()] = true;
      self.touchUsed = false;
    });

    document.addEventListener("keyup", function (event) {
      self.keys[event.key.toUpperCase()] = false;
      self.touchUsed = false;
    });

    document.addEventListener("mousemove", function (event) {
      self.mouseMoveCallBack(event);
      self.mouseMovementSinceLast[0] += event.movementX;
      self.mouseMovementSinceLast[1] += event.movementY;
      self.mousePosition = {
        x: event.clientX,
        y: event.clientY,
        previousX: self.mousePosition.x,
        previousY: self.mousePosition.y,
      };
      if (self.simulateTouchBasedOnMouse && self.mouseClicked) {
        self.handleTouch([event]);
      }
    });

    document.addEventListener("mousedown", (event) => {
      if (event.button == 0) {
        self.mouseClicked = true;
        if (self.simulateTouchBasedOnMouse) {
          self.handleTouch([event]);
        }
      } else if (event.button == 2) {
        self.mouseRightClicked = true;
      }
    });
    document.addEventListener("mouseup", (event) => {
      if (event.button == 0) {
        self.mouseClicked = false;
        if (self.simulateTouchBasedOnMouse) {
          self.handleTouch([]);
        }
      } else if (event.button == 2) {
        self.mouseRightClicked = false;
      }
    });

    document.addEventListener("touchstart", function (event) {
      self.handleTouch(event.touches);
    });
    document.addEventListener("touchmove", function (event) {
      event.preventDefault();
      self.handleTouch(event.touches);
    });
    document.addEventListener("touchend", function (event) {
      self.handleTouch(event.touches);
    });
    //----------------

    this.joystickLeftDirection = [0, 0];
    this.joystickRightDirection = [0, 0];
  }

  mouseMoveCallBack(event) {
    // Overload this if you want direct controll of the events
  }

  handleTouch(touches) {
    this.touchUsed = true;
  }

  getMouseMovement() {
    let diff = [this.mouseMovementSinceLast[0], this.mouseMovementSinceLast[1]];
    this.mouseMovementSinceLast = [0.0, 0.0];
    return diff;
  }

  updateGamepad() {
    if (window.isSecureContext) {
      this.gamepads = navigator.getGamepads();

      for (const gp of this.gamepads) {
        if (!gp) {
          continue;
        }

        this.touchUsed = false;
        if (Math.abs(gp.axes[0]) > 0.1) {
          this.joystickLeftDirection[0] = gp.axes[0];
        } else {
          this.joystickLeftDirection[0] = 0.0;
        }

        if (Math.abs(gp.axes[1]) > 0.1) {
          this.joystickLeftDirection[1] = gp.axes[1];
        } else {
          this.joystickLeftDirection[1] = 0.0;
        }

        this.touchUsed = false;
        if (Math.abs(gp.axes[2]) > 0.1) {
          this.joystickRightDirection[0] = gp.axes[2];
        } else {
          this.joystickRightDirection[0] = 0.0;
        }

        if (Math.abs(gp.axes[3]) > 0.1) {
          this.joystickRightDirection[1] = gp.axes[3];
        } else {
          this.joystickRightDirection[1] = 0.0;
        }

        for (const key of this.buttons.keys()) {
          this.buttons.set(key, false);
        }

        if (gp.buttons[0].value > 0.5) {
          this.buttons.set("A", true);
        }
        if (gp.buttons[1].value > 0.5) {
          this.buttons.set("B", true);
        }
        if (gp.buttons[2].value > 0.5) {
          this.buttons.set("C", true);
        }
      }
    }
  }
}

export const Input = new InputHandler();
