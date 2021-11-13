/*
* Copyright 2021 Collabora, Ltd.
*
* SPDX-License-Identifier: MIT
*/

let game = (function() {
    let bounce = new Audio('bounce.wav');
    let crash = new Audio('explosion.wav');

    /* Render one frame to the canvas */
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

        function hollowRect(x, y, w, h, color) {
            context.beginPath();
            context.strokeStyle = color;
            context.lineWidth = 0.002;
            context.rect(x, y, w, h);
            context.stroke();
        }

        function drawBat(x, y, w, h) {
            hollowRect(x - w/2, y - h/2, w, h, "white");
        }

        function drawBall(x, y, w, h) {
            hollowRect(x - w/2, y - h/2, w, h, "white");
        }

        drawBat(state.left_bat.x, state.left_bat.y, state.left_bat.w, state.left_bat.h);
        drawBat(state.right_bat.x, state.right_bat.y, state.right_bat.w, state.right_bat.h);
        drawBall(state.ball.x, state.ball.y, state.ball.w, state.ball.h);
        context.restore();
    }

    /* Pick a random starting velocity for the ball */
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

    /* Initialise the game state, with the ball in the middle and the
     * bats in their starting positions */
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

    /* Read the controller and update the player's bat */
    function checkInput(controller, state, dt) {
        let controls = controller.read();
        if( controls === undefined ) {
            throw { error: "controller-disconnected" };
        }
        const player_speed = 0.4;
        let move = 0;
        if( controls.stick !== undefined ) {
            move += controls.stick.y;
        }
        if( controls.left_stick !== undefined ) {
            move += controls.left_stick.y;
        }
        if( controls.dpad !== undefined ) {
            move += controls.dpad.y;
        }
        state.left_bat.y += dt * player_speed * Math.min(1, Math.max(-1, move));
    }

    /* Simple AI player */
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

    /* Check whether two rectangles intersect; used for bat/ball
     * collisions */
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

    /* Move the ball, bouncing it off anything it hits */
    function updateState(state, dt) {
        const bounceSpeedUp = 1.05;

        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;
        state.left_bat.y = Math.max(state.left_bat.y, state.left_bat.h/2);
        state.left_bat.y = Math.min(state.left_bat.y, 0.75 - state.left_bat.h/2);
        state.right_bat.y = Math.max(state.right_bat.y, state.right_bat.h/2);
        state.right_bat.y = Math.min(state.right_bat.y, 0.75 - state.right_bat.h/2);

        /* This function slightly increases the speed of the ball each
           time it hits a bat, and randomises the exit angle
           slightly. */
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

    /* Wrapper function to set up a single game, with a given
     * controller, and play */
    function oneGame(canvas, controller) {
        let aiPlayer = makeAiPlayer()
        return new Promise((resolve, reject) => {
            let state = initialState();
            let prev_ts;

            (function loop(ts) {
                try {
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
                } catch( error ) {
                    reject(error);
                    return;
                }
            })();
        });
    }

    function setupGamepadScreen() {

        function waitForButton(canvas) {
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

            return atariControllers.pressA();
        }
        return {
            wait: waitForButton
        }
    }

    function main() {
        let canvas = document.getElementById('pong');
        let gamepadSetupScreen = setupGamepadScreen();
        (function loop() {
            gamepadSetupScreen.wait(canvas)
                .then(controller => oneGame(canvas, controller))
                .finally(() => setTimeout(loop, 0));
        })();
    }

    return {
        run: main
    };
})();

window.onload = () => game.run();
