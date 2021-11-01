let game = (function() {
    /* Got to the point where Bluetooth breaks things */
    let bounce = new Audio('bounce.wav');
    let crash = new Audio('explosion.wav');

    function readController(index) {
        let controller = navigator.getGamepads()[index];
        if( controller.mapping === "" ) {
            if( controller.id.startsWith("Atari Classic") ) {
                return {
                    buttons: {
                        a: controller.buttons[0],
                        b: controller.buttons[1],
                    },
                    stick: {
                        x: controller.axes[1],
                        y: controller.axes[2]
                    },
                }
            } else if (controller.id.startsWith("Atari")) {
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
                    }
                }
            }
        } else if( controller.mapping === "standard" ) {
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
                }
            }
        } else {
            return {}
        }
    }
    function draw(canvas, state) {
        /* Arrange for our playfield to be between
           0 and 1 in x
           0 and 0.75 in y
        */
        function setupContext() {
            let context = canvas.getContext('2d');
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            context.fillStyle = "black";
            context.fillRect(0, 0, canvas.width, canvas.height);
            let max_size = Math.min(canvas.width, canvas.height*4/3);
            context.strokeStyle = "white";
            context.strokeRect(
                (canvas.width - max_size)/2,
                (canvas.height - max_size*0.75)/2,
                max_size,
                max_size*0.75);
            context.save();
            context.scale(max_size, max_size);
            if(max_size == canvas.width) {
                let full_y  = canvas.height/max_size;
                context.translate(0, (full_y - 0.75)/2);
            } else {
                let full_x = canvas.width/max_size;
                context.translate((full_x - 1)/2, 0);
            }
            return context;
        }

        let context = setupContext();

        function solidRect(x, y, w, h, color) {
            context.beginPath();
            context.fillStyle = color;
            context.rect(x, y, w, h);
            context.fill();
        }

        function drawBat(x, y, w, h) {
            solidRect(x - w/2, y - h/2, w, h, "white");
        }

        function drawBall(x, y, w, h) {
            solidRect(x - w/2, y - h/2, w, h, "white");
        }

        drawBat(state.left_bat.x, state.left_bat.y, state.left_bat.w, state.left_bat.h);
        drawBat(state.right_bat.x, state.right_bat.y, state.right_bat.w, state.right_bat.h);
        drawBall(state.ball.x, state.ball.y, state.ball.w, state.ball.h);
        context.restore();
    }

    function random_velocity(speed) {
        let angle = Math.random();
        if( angle > 0.5 ) {
            angle = (angle - 0.5) * Math.PI/2 + Math.PI/4;
        } else {
            angle = angle * -Math.PI/2  - Math.PI/4;
        }
        return {
            x: Math.sin(angle) * speed,
            y: Math.cos(angle) * speed
        }
    }

    function random(low, high) {
        return Math.random() * (high - low) + low;
    }

    function initialState() {
        const margin = 0.04;
        const bat_width = 0.04;
        const bat_height = 0.2;
        const ball_size = 0.04;

        let ball_velocity = random_velocity(random(0.5, 0.8));

        return {
            ball: {
                x: 0.5,
                y: 0.5,
                w: ball_size,
                h: ball_size,
                vx: ball_velocity.x,
                vy: ball_velocity.y
            },
            left_bat: {
                x: margin,
                y: 0.5,
                h: bat_height,
                w: bat_width
            },
            right_bat: {
                x: 1 - margin,
                y: 0.5,
                h: bat_height,
                w: bat_width
            }
        };
    }

    function checkInput(controller_id, state, dt) {
        let controller = readController(controller_id);
        const player_speed = 0.4;
        let move = 0;
        if( controller.stick !== undefined ) {
            move += controller.stick.y;
        }
        if( controller.left_stick !== undefined ) {
            move += controller.left_stick.y;
        }
        if( controller.dpad !== undefined ) {
            move += controller.dpad.y;
        }
        state.left_bat.y += dt * player_speed * Math.min(1, Math.max(-1, move));
    }

    function makeAiPlayer() {
        const ai_speed = 0.4;
        const ai_accel = 0.1;
        let vy = 0;
        function update(state, dt) {
            let t = Math.abs((state.right_bat.x - state.ball.x)/state.ball.vx);
            let dvy = (state.ball.vy - vy);
            let dy = (state.ball.y - state.right_bat.y);
            let ay = 2 * (dy + dvy * t) / (t*t);
            vy += Math.max(-ai_accel, Math.min(ai_accel, ay));
            vy = Math.min(ai_speed, Math.max(-ai_speed, vy));
            state.right_bat.y += vy * dt;
        }
        return {
            update: update
        };
    }

    function checkCollision(r1, r2) {
        let r1x1 = r1.x - r1.w/2;
        let r1x2 = r1.x + r1.w/2;
        let r2x1 = r2.x - r2.w/2;
        let r2x2 = r2.x + r2.w/2;

        let test_x = Math.min(r1x2, r2x2) - Math.max(r1x1, r2x1);

        let r1y1 = r1.y - r1.h/2;
        let r1y2 = r1.y + r1.h/2;
        let r2y1 = r2.y - r2.h/2;
        let r2y2 = r2.y + r2.h/2;

        let test_y = Math.min(r1y2, r2y2) - Math.max(r1y1, r2y1);
        return test_x >= 0 && test_y >= 0;
    }

    function updateState(state, dt) {
        const bounceSpeedUp = 1.05;

        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;
        state.left_bat.y = Math.max(state.left_bat.y, state.left_bat.h/2);
        state.left_bat.y = Math.min(state.left_bat.y, 0.75 - state.left_bat.h/2);
        state.right_bat.y = Math.max(state.right_bat.y, state.right_bat.h/2);
        state.right_bat.y = Math.min(state.right_bat.y, 0.75 - state.right_bat.h/2);

        function bounce_bat(ball) {
            var mag = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            mag *= bounceSpeedUp;
            let angle = Math.atan2(ball.vy, -ball.vx);
            angle += 5*(Math.random() * 2 - 1)*Math.PI/180;
            ball.vx = Math.cos(angle) * mag;
            ball.vy = Math.sin(angle) * mag;
        }

        if( checkCollision(state.left_bat, state.ball) ) {
            state.ball.x = state.left_bat.x + state.left_bat.w/2 + state.ball.w/2;
            bounce_bat(state.ball);
            bounce.play();
        }
        if( checkCollision(state.right_bat, state.ball) ) {
            state.ball.x = state.right_bat.x - state.right_bat.w/2 - state.ball.w/2;
            bounce_bat(state.ball);
            bounce.play();
        }
        if( state.ball.y < state.ball.h/2 ) {
            state.ball.y = state.ball.h/2;
            state.ball.vy *= -1;
            bounce.play();
        }
        if( state.ball.y > 0.75 -state.ball.h/2 ) {
            state.ball.y = 0.75 - state.ball.h/2;
            state.ball.vy *= -1;
            bounce.play();
        }
        if( state.ball.x < state.ball.w/2 ) {
            crash.play();
            state.ball.x = state.ball.w/2;
            return { "winner": "ai" };
        } else if( state.ball.x > 1-state.ball.w/2 ) {
            crash.play();
            state.ball.x = 1-state.ball.w/2;
            return { "winner": "player" };
        }
    }

    function oneGame(canvas, controller) {
        let aiPlayer = makeAiPlayer()
        return new Promise((resolve, reject) => {
            let state = initialState();
            let prev_ts;

            (function loop(ts) {
                const dt = prev_ts !== undefined ? (ts - prev_ts)/1000 : 0;
                prev_ts = ts;

                let status = updateState(state, dt);
                draw(canvas, state);
                if( status !== undefined ) {
                    resolve(status);
                    return;
                }
                checkInput(controller, state, dt);
                aiPlayer.update(state, dt);

                window.requestAnimationFrame(loop)
            })();
        });
    }

    function setupGamepads() {
        let gamepads = [];
        window.addEventListener("gamepadconnected", e => gamepads.push(e.gamepad));
        window.addEventListener("gamepaddisconnected", e => gamepads.splice(gamepads.indexOf(e.gamepad)), 1);

        function waitForButton(canvas) {
            function drawInfo() {
                let context = canvas.getContext('2d');
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                context.fillStyle = "black";
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.save();
                context.textAlign = "center";
                context.font = "50px serif";
                context.fillStyle = "white";
                context.fillText("Press A on your controller",
                                 canvas.width/2, canvas.height/2, canvas.width/2);
                context.restore();
            }

            return new Promise((resolve, reject) => {
                (function loop(timestamp) {
                    drawInfo();
                    for( var i=0; i<gamepads.length; ++i ) {
                        let pad = readController(gamepads[i].index);
                        if( pad.buttons.a.pressed ) {
                            resolve(i);
                            return;
                        }
                    }
                    setTimeout(loop, 15);
                })();

            });
        }
        return {
            wait: waitForButton
        }
    }

    function main() {
        let canvas = document.getElementById('pong');
        let gamepads = setupGamepads();
        (function loop() {
            gamepads.wait(canvas)
                .then(controller => oneGame(canvas, controller))
                .then(() => setTimeout(loop, 0));
        })();
    }

    return {
        run: main
    };
})();

window.onload = () => game.run();
