import Phaser from "phaser";

import { Part4Scene } from "./scenes/Part4Scene";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    fps: {
        target: 90,
        forceSetTimeOut: true,
        smoothStep: false,
    },
    width: 800,
    height: 600,
    // height: 200,
    backgroundColor: '#000000',
    parent: 'phaser-example',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    pixelArt: true,
    scene: [Part4Scene],
};

const game = new Phaser.Game(config);

