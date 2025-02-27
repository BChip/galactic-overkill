import Phaser from 'phaser';

export class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
    }

    preload() {
        this.createBulletHitTexture();
        this.load.image('small_cropped', 'assets/small_cropped.webp');
        this.load.audio('background-music', 'assets/music.ogg');
        this.load.audio('shoot-sound', 'assets/shoot.ogg');
        this.load.audio('powerup-sound', 'assets/powerup.ogg');
        this.load.audio('explosion-sound', 'assets/explosion.ogg');
    }

    createBulletHitTexture() {
        // Create a particle texture
        const graphics = this.add.graphics();
        graphics.fillStyle(0xff6600, 1); // Orange color
        graphics.fillRect(0, 0, 4, 4);
        graphics.generateTexture('particle', 4, 4);
        graphics.destroy();
    }

    create() {
        this.add.image(400, 200, "small_cropped");

        // Add instruction text
        this.add.text(400, 400, 'Enter your username to start the game', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Create DOM input for username
        const usernameInput = this.add.dom(400, 450, 'input', {
            type: 'text',
            placeholder: 'Your username',
            fontSize: '18px',
            padding: '5px',
            width: '200px',
            color: 'black'
        });

        // Create DOM submit button
        const submitButton = this.add.dom(400, 500, 'button', {
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
        }, 'Start Game');

        // Handle submit button click
        submitButton.node.addEventListener('click', () => {
            const username: string = usernameInput.node.value.trim();
            if (username) {
                // Start MainScene with the username
                this.scene.start('MainScene', { username: username.toLowerCase() });
            }
        });
    }
}