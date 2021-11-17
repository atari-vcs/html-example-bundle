/*
* Copyright 2021 Collabora, Ltd.
*
* SPDX-License-Identifier: MIT
*/
let atariControllers = (function() {
    function findController(index) {
        let controllers = navigator.getGamepads();
        for( var i=0; i<controllers.length; ++i ) {
            if( controllers[i].index == index ) {
                return controllers[i];
            }
        }
    }

    function classifyController(controller) {
        if( controller.mapping === "standard" ) {
            return { vendor: "Generic", type: "controller" };
        }
        let match = controller.id.match(/.*\(\s*Vendor:\s*(\d+)\s+Product:\s*(\d+)\s*\).*/);
        if( match === null ) {
            return;
        }
        let vendor = parseInt(match[1]);
        let product = parseInt(match[2]);
        if( vendor === 3250 ) { // Atari
            if( product === 1002 ) { // Standard controller
                return { vendor: "Atari", type: "controller" };
            } else if( product === 1001 ) { // Classic controller
                return { vendor: "Atari", type: "joystick" };
            }
            // Fallback: a new type of Atari controller; use the
            // button mappings from the existing types.
            if( controller.buttons.length >= 8 && controller.axes.length >= 8 ) {
                return { vendor: "Atari", type: "controller" };
            } else if (controller.buttons.length >= 2 && controller.axes.length >= 3 ) {
                return { vendor: "Atari", type: "joystick" }
            }
        }
    }

    function readController(controller) {
        let model = classifyController(controller);
        if( !model ) {
            return;
        }
        if( model.vendor === "Atari" ) {
            if( model.type === "joystick" ) {
                return {
                    buttons: {
                        a: controller.buttons[0],
                        b: controller.buttons[1],
                    },
                    stick: {
                        x: controller.axes[1],
                        y: controller.axes[2]
                    },
                    classic: true
                }
            } else if( model.type == "controller" ) {
                return {
                    buttons: {
                        a: controller.buttons[0],
                        b: controller.buttons[1],
                        x: controller.buttons[2],
                        y: controller.buttons[3],
                        lb: controller.buttons[4],
                        rb: controller.buttons[5],
                        lsb: controller.buttons[6],
                        rsb: controller.buttons[7]
                    },
                    left_stick: {
                        x: controller.axes[0],
                        y: controller.axes[1]
                    },
                    right_stick: {
                        x: controller.axes[2],
                        y: controller.axes[3]
                    },
                    dpad: {
                        x: controller.axes[6],
                        y: controller.axes[7]
                    },
                    triggers: {
                        left: controller.axes[5],
                        right: controller.axes[4]
                    },
                    classic: false
                }
            }
        } else if( model.vendor === "Generic" && model.type === "controller") {
            return {
                buttons: {
                    a: controller.buttons[0],
                    b: controller.buttons[1],
                    x: controller.buttons[2],
                    y: controller.buttons[3],
                    lb: controller.buttons[4],
                    rb: controller.buttons[5],
                    lsb: controller.buttons[10],
                    rsb: controller.buttons[11]
                },
                left_stick: {
                    x: controller.axes[0],
                    y: controller.axes[1]
                },
                right_stick: {
                    x: controller.axes[2],
                    y: controller.axes[3]
                },
                dpad: {
                    x: (controller.buttons[15].pressed ? 1 : 0) + (controller.buttons[14].pressed ? -1 : 0),
                    y: (controller.buttons[13].pressed ? 1 : 0) + (controller.buttons[12].pressed ? -1 : 0)
                },
                triggers: {
                    left: (controller.buttons[6].pressed ? 2 : 0) - 1,
                    right: (controller.buttons[7].pressed ? 2 : 0) - 1,
                },
                classic: false,
            }
        }
    }

    function pulseController(controller, duration, intensityHigh, intensityLow) {
        let actuator = controller.vibrationActuator;
        if( actuator !== undefined && actuator.type === 'dual-rumble' ) {
            actuator.playEffect(
                'dual-rumble',
                {
                    duration: duration,
                    startDelay: 0,
                    strongMagnitude: intensityLow,
                    weakMagnitude: intensityHigh
                }
            );
        }
    }

    function isHapticController(controller) {
        return controller.vibrationActuator !== undefined;
    }

    let activeControllers = [];

    function makeController(index) {
        return {
            read: () => readController(findController(index)),
            vibrate: (duration, intensityHigh, intensityLow) => pulseController(findController(index), duration, intensityHigh, intensityLow),
            can_vibrate: () => isHapticController(findController(index))
        }
    }

    window.addEventListener("gamepadconnected", function(e) {
        activeControllers.push(makeController(e.gamepad.index));
    });

    window.addEventListener("gamepaddisconnected", function(e) {
        let controller = findController(e.gamepad.index);
        if( controller.ondisconnected ) {
            controller.ondisconnected(controller);
        }
        activeControllers.splice(gamepads.indexOf(controller), 1);
    });

    function getControllerForButtonPress() {
        return new Promise((resolve, reject) => {
            (function loop() {
                for( var i=0; i<activeControllers.length; ++i ) {
                    let state = activeControllers[i].read();
                    if( state.buttons.a.pressed ) {
                        resolve(activeControllers[i]);
                        return;
                    }
                }
                setTimeout(loop, 100);
            })();
        });
    }

    return {
        getAll: () => activeControllers.slice(),
        pressA: () => getControllerForButtonPress(),
    };
})();
