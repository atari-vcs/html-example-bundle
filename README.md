# HTML Example Bundle

This is a simple HTML5 game, based on the classic Atari Pong title,
from 1972.

## Installing

You will need to enable Atari Homebrew on your VCS. Once you have done
so, go to

  https://atari-vcs:3030/

and select `Upload`. Select the file `html-pong-example.bundle` in
this directory. You can then launch this game, like any homebrew
title, from the same interface.

## Gameplay

Use your Atari controller to move the bat on the left-hand side of
the screen. Press (A) to start a game.

## Building

You can recreate the bundle by running

   `./make_bundle.sh` 
   
in any suitable Linux environment with `zip` installed. 

Alternatively, on other plaforms, you can recreate it by creating a
new ZIP archive, and adding the contents of this directory to it. That
archive is now your new homebrew bundle.
