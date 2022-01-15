# HTML Example Bundle

This is a simple HTML5 game, based on the classic Atari Pong title,
from 1972.

## Installing

You will need to enable Atari Homebrew on your VCS. Once you have done
so, go to

  https://atari-vcs:3030/

and select `Upload`. Select the file `html-pong-example_0.1.0.bundle`
built from this directory. You can then launch this game, like any
homebrew title, from the same interface.

## Gameplay

Use your Atari controller to move the bat on the left-hand side of
the screen. Press (A) to start a game.

## Building

You can create the bundle by running

   `make_bundle.sh html-pong-example.yaml`

in any suitable Linux-like environment with the
[bundle-gen](https://github.com/atari-vcs/bundle-gen) script
[`make-bundle.sh`](https://github.com/atari-vcs/bundle-gen/blob/main/make-bundle.sh)
installed in your PATH, and Docker installed on your machine.

## License

This example is made available under either an
[Apache-2.0](https://opensource.org/licenses/Apache-2.0) or an [MIT
license](https://opensource.org/licenses/MIT). 
