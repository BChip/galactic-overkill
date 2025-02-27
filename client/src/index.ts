import { MainScene } from "./scenes/MainScene";
import { LoadingScene } from "./scenes/LoadingScene"

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    fps: {
        target: 60,
        forceSetTimeOut: true,
        smoothStep: false,
    },
    width: 1400,
    height: 700,
    backgroundColor: '#000000',
    parent: 'gameContainer', // Match the div ID in the HTML
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    dom: {
        createContainer: true // Enables DOM elements in scenes
    },
    pixelArt: true,
    scene: [LoadingScene, MainScene],
};

const game = new Phaser.Game(config);
