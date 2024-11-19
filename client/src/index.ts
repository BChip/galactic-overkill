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
    backgroundColor: '#000000',
    parent: 'gameContainer', // Match the div ID in the HTML
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
