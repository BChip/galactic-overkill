import Phaser from "phaser";
import { Room, Client } from "colyseus.js";
import { GameState, Player } from "../../../server/src/rooms/Part4State";
import { StarfieldConfig, StarfieldManager } from "../managers/starfieldmanager";

interface FloatingText {
    text: Phaser.GameObjects.Text;
    startTime: number;
    duration: number;
}

export class Part4Scene extends Phaser.Scene {
    private room!: Room;
    private player!: Phaser.GameObjects.Triangle;
    private playerEntities: { [sessionId: string]: Phaser.GameObjects.Triangle } = {};
    private bullets: { [bulletId: string]: Phaser.GameObjects.Rectangle } = {};
    private powerUps: { [powerUpId: string]: Phaser.GameObjects.Rectangle } = {};
    private starfieldManager!: StarfieldManager;
    private keys!: { [key: string]: Phaser.Input.Keyboard.Key };
    private currentTick: number = 0;
    private worldContainer!: Phaser.GameObjects.Container;
    private particleManagers: { [key: string]: Phaser.GameObjects.Particles.ParticleEmitterManager } = {};
    private music!: Phaser.Sound.BaseSound;
    private shootSound!: Phaser.Sound.BaseSound;
    private powerupSound!: Phaser.Sound.BaseSound;
    private explosionSound!: Phaser.Sound.BaseSound;
    private floatingTexts: FloatingText[] = [];
    private healthBars: { [sessionId: string]: Phaser.GameObjects.Graphics } = {};
    private leaderboardContainer!: Phaser.GameObjects.Container;
    private leaderboardText!: Phaser.GameObjects.Text;
    private isLeaderboardVisible: boolean = false;



    constructor() {
        super({ key: "GameScene" });
    }

    preload() {
        this.createBulletHitTexture();
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

    setupPowerUpNotifications() {
        this.room.onMessage("powerUpCollected", (data) => {
            const { playerId, type, value, x, y } = data;
            if (playerId === this.room.sessionId) {
                this.powerupSound.play({
                    detune: Phaser.Math.Between(-50, 50),
                    rate: Phaser.Math.FloatBetween(0.98, 1.02)
                });

                let message = '';
                switch (type) {
                    case 'health': message = `+${value} Health`; break;
                    case 'firerate': message = 'Fire Rate Increased!'; break;
                    case 'speed': message = 'Speed Boost!'; break;
                }

                this.showFloatingText(message, x, y);
            }
        });
    }

    showFloatingText(message: string, x: number, y: number) {
        const text = this.add.text(
            x,
            y,
            message,
            {
                fontSize: '12px',
                color: '#00ff00',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5, 0.5)
            .setDepth(2);

        this.worldContainer.add(text);  // Add to world container

        this.floatingTexts.push({
            text,
            startTime: this.time.now,
            duration: 2000
        });
    }

    updateFloatingTexts() {
        const currentTime = this.time.now;
        this.floatingTexts = this.floatingTexts.filter(({ text, startTime, duration }) => {
            const elapsed = currentTime - startTime;
            if (elapsed >= duration) {
                text.destroy();
                return false;
            }

            const alpha = 1 - (elapsed / duration);
            text.setAlpha(alpha);

            return true;
        });
    }

    async create() {
        this.music = this.sound.add('background-music', {
            volume: 0.2,       // 50% volume
            loop: true         // Will loop continuously
        });

        this.shootSound = this.sound.add('shoot-sound', {
            volume: 0.2,
            rate: 1,      // Playback rate (1 = normal speed)
            detune: 0     // Pitch adjustment in cents
        });

        this.powerupSound = this.sound.add('powerup-sound', {
            volume: 0.2,
            rate: 1,      // Playback rate (1 = normal speed)
            detune: 0     // Pitch adjustment in cents
        });

        this.explosionSound = this.sound.add('explosion-sound', {
            volume: 0.2,
            rate: 1,      // Playback rate (1 = normal speed)
            detune: 0     // Pitch adjustment in cents
        });

        this.music.play();
        // Create a container for all game objects
        this.worldContainer = this.add.container(0, 0);

        // Create starfield background
        this.starfieldManager = new StarfieldManager(this, 2000, 2000);
        this.starfieldManager.getLayers().forEach(layer => this.worldContainer.add(layer));

        // Setup input
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
        }) as any;

        // Connect to server
        await this.connect();

        this.leaderboardContainer = this.add.container(10, 10).setVisible(false).setDepth(10);
        this.leaderboardText = this.add.text(0, 0, '', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { left: 5, right: 5, top: 5, bottom: 5 },
            align: 'left',
        }).setOrigin(0);
        this.leaderboardContainer.add(this.leaderboardText);

        // Listen for Tab key
        this.input.keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
            event.preventDefault(); // Prevent the browser's default Tab behavior
            this.showLeaderboard();
        });

        this.input.keyboard.on('keyup-TAB', (event: KeyboardEvent) => {
            event.preventDefault(); // Prevent the browser's default Tab behavior
            this.hideLeaderboard();
        });


        // Listen for game over
        this.room.onMessage("gameOver", (data) => {
            const gameOverText = this.add.text(400, 300, 'GAME OVER!\nWinner: ' + data.winner, {
                color: '#ffffff',
                align: 'center',
                fontSize: '32px'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2);

            this.time.delayedCall(5000, () => {
                this.scene.restart();
            });
        });

        this.setupPowerUpNotifications();

        this.particleManagers['bulletImpact'] = this.add.particles(0, 0, 'particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: { min: 200, max: 400 },
            blendMode: 'ADD',
            gravityY: 0,
            quantity: 1,
            reserve: 50, // Pool size for particles
            frequency: -1 // Manual emit only
        });

        this.worldContainer.add(this.particleManagers['bulletImpact']);
    }

    async connect() {
        const BACKEND_URL = (window.location.href.indexOf("localhost") === -1)
            ? `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${(window.location.port && `:${window.location.port}`)}`
            : "ws://localhost:2567"
        console.log(BACKEND_URL)
        const client = new Client(BACKEND_URL);
        try {
            this.room = await client.joinOrCreate<GameState>("game");
            this.setupRoomHandlers();
        } catch (e) {
            console.error("Join error:", e);
        }
    }

    showLeaderboard() {
        this.isLeaderboardVisible = true;
        this.updateLeaderboard();
        this.leaderboardContainer.setVisible(true);
    }

    hideLeaderboard() {
        this.isLeaderboardVisible = false;
        this.leaderboardContainer.setVisible(false);
    }

    updateLeaderboard() {
        if (!this.isLeaderboardVisible) return;

        const players = Array.from(this.room.state.players.values());
        players.sort((a: Player, b: Player) => b.kills - a.kills); // Sort players by kills (highest first)

        let leaderboardText = 'LEADERBOARD\n';
        leaderboardText += '-----------------\n';

        players.forEach((player: Player, index) => {
            const rank = index + 1;
            leaderboardText += `${rank}. ${player.sessionId}${player.sessionId === this.room.sessionId ? "(YOU)" : ""} - Kills: ${player.kills}\n`;
        });

        this.leaderboardText.setText(leaderboardText);
    }

    setupRoomHandlers() {

        const colorToHex = (color: string): number => {
            return parseInt(color.replace('#', '0x'));
        };


        this.room.state.players.onAdd((player: Player, sessionId: string) => {
            // Create a better-shaped triangle with proper pivot point
            const triangle = this.add.triangle(
                player.x,
                player.y,
                0, -5,  // top point (tip)
                10, 15,  // bottom right
                -10, 15, // bottom left
                colorToHex(player.color)
            );

            // Set origin to center for proper rotation
            triangle.setOrigin(0.1, 0.5);

            // Create a health bar for the player
            const healthBar = this.add.graphics();
            this.healthBars[sessionId] = healthBar;

            this.worldContainer.add(triangle);
            this.worldContainer.add(healthBar);
            this.playerEntities[sessionId] = triangle;

            if (sessionId === this.room.sessionId) {
                this.player = triangle;
                this.player.setPosition(player.x, player.y);
                this.worldContainer.setPosition(
                    this.cameras.main.centerX - player.x,
                    this.cameras.main.centerY - player.y
                );
            }

            // Store server positions for interpolation
            triangle.setData('serverX', player.x);
            triangle.setData('serverY', player.y);
            triangle.setData('serverRotation', player.rotation);

            player.onChange(() => {
                const entity = this.playerEntities[sessionId];
                if (entity && entity.active) {
                    entity.setPosition(player.x, player.y);
                    this.updateHealthBar(sessionId, player);
                    if (sessionId === this.room.sessionId) {
                        entity.setPosition(player.x, player.y);

                        // Smoothly interpolate rotation
                        let targetRotation = player.rotation;
                        let currentRotation = entity.rotation;

                        // Normalize both rotations to be between 0 and 2π
                        targetRotation = (targetRotation + Math.PI * 2) % (Math.PI * 2);
                        currentRotation = (currentRotation + Math.PI * 2) % (Math.PI * 2);

                        // Choose the shortest rotation path
                        let diff = targetRotation - currentRotation;
                        if (diff > Math.PI) diff -= Math.PI * 2;
                        if (diff < -Math.PI) diff += Math.PI * 2;

                        entity.setRotation(currentRotation + diff * 0.5);

                        this.worldContainer.setPosition(
                            this.cameras.main.centerX - player.x,
                            this.cameras.main.centerY - player.y
                        );
                    } else {
                        entity.setData('serverX', player.x);
                        entity.setData('serverY', player.y);
                        entity.setData('serverRotation', player.rotation);
                    }
                }
            });
        });

        this.room.state.players.onRemove((player: Player, sessionId: string) => {
            const entity = this.playerEntities[sessionId];
            if (entity) {
                entity.destroy();
                delete this.playerEntities[sessionId];
            }

            const healthBar = this.healthBars[sessionId];
            if (healthBar) {
                healthBar.destroy();
                delete this.healthBars[sessionId];
            }
        });

        this.room.state.powerUps.onAdd((powerUp, powerUpId) => {
            const colors = {
                health: 0xff0000,
                firerate: 0x00ff00,
                speed: 0x0000ff,
                ammo: 0xffff00
            };
            const rect = this.add.rectangle(powerUp.x, powerUp.y, 15, 15, colors[powerUp.type]);
            this.worldContainer.add(rect);
            this.powerUps[powerUpId] = rect;
        });

        this.room.state.powerUps.onRemove((powerUp, powerUpId) => {
            const entity = this.powerUps[powerUpId];
            if (entity) {
                entity.destroy();
                delete this.powerUps[powerUpId];
            }
        });

        // In GameScene.ts
        this.room.state.bullets.onAdd((bullet, bulletId) => {
            if (bullet.ownerId === this.room.sessionId) {
                this.shootSound.play({
                    detune: Phaser.Math.Between(-50, 50),
                    rate: Phaser.Math.FloatBetween(0.98, 1.02)
                });
            }


            // Ensure coordinates are valid numbers
            const x = Number(bullet.x) || 0;
            const y = Number(bullet.y) || 0;

            const rect = this.add.rectangle(x, y, 4, 4, 0xFF0000);
            this.worldContainer.add(rect);
            this.bullets[bulletId] = rect;

            bullet.onChange(() => {
                const entity = this.bullets[bulletId];
                if (entity) {
                    const newX = Number(bullet.x) || 0;
                    const newY = Number(bullet.y) || 0;
                    entity.setPosition(newX, newY);
                }
            });
        });

        this.room.state.bullets.onRemove((bullet, bulletId) => {
            const entity = this.bullets[bulletId];
            if (entity) {
                // Create impact effect at bullet position
                this.addBulletImpact(entity.x, entity.y);

                // Remove the bullet
                entity.destroy();
                delete this.bullets[bulletId];
            }
        });
    }

    updateHealthBar(sessionId: string, player: Player) {
        const healthBar = this.healthBars[sessionId];
        if (!healthBar) return;

        const entity = this.playerEntities[sessionId];
        if (!entity) return;

        const barWidth = 40;
        const barHeight = 5;

        const healthRatio = Math.max(player.health / 100, 0);

        healthBar.clear();

        // Draw background (damage taken)
        healthBar.fillStyle(0xff0000);
        healthBar.fillRect((entity.x - 2) - barWidth / 2, entity.y - 25, barWidth, barHeight);

        // Draw foreground (current health)
        healthBar.fillStyle(0x00ff00);
        healthBar.fillRect((entity.x - 2) - barWidth / 2, entity.y - 25, barWidth * healthRatio, barHeight);

        if (player.health >= 100) {
            healthBar.setVisible(false);
        } else {
            healthBar.setVisible(true);
        }
    }

    addBulletImpact(x: number, y: number) {
        const particles = this.particleManagers['bulletImpact'];

        this.explosionSound.play({
            detune: Phaser.Math.Between(-50, 50),
            rate: Phaser.Math.FloatBetween(0.98, 1.02)
        });

        if (particles) {
            particles.emitParticleAt(x, y, 50); // Emit 10 particles at impact point
        }
    }

    update(time: number, delta: number) {
        if (!this.room || !this.player) return;

        this.currentTick++;
        this.updateFloatingTexts();

        const input = {
            left: this.keys.left.isDown,
            right: this.keys.right.isDown,
            up: this.keys.up.isDown,
            down: this.keys.down.isDown,
            shooting: this.keys.shoot.isDown,
            tick: this.currentTick
        };

        this.room.send(0, input);

        const velocity = {
            x: (this.keys.left.isDown ? -1 : 0) + (this.keys.right.isDown ? 1 : 0),
            y: (this.keys.up.isDown ? -1 : 0) + (this.keys.down.isDown ? 1 : 0)
        };
        this.starfieldManager.update(velocity.x, velocity.y);

        // Interpolate other players
        this.room.state.players.forEach((player, sessionId) => {
            if (sessionId !== this.room.sessionId) {
                const entity = this.playerEntities[sessionId];
                if (entity && entity.active) {
                    const { serverX, serverY, serverRotation } = entity.data.values;
                    entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
                    entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);

                    this.updateHealthBar(sessionId, player);

                    // Normalize rotations
                    let currentRotation = (entity.rotation + Math.PI * 2) % (Math.PI * 2);
                    let targetRotation = (serverRotation + Math.PI * 2) % (Math.PI * 2);

                    // Choose shortest rotation path
                    let diff = targetRotation - currentRotation;
                    if (diff > Math.PI) diff -= Math.PI * 2;
                    if (diff < -Math.PI) diff += Math.PI * 2;

                    entity.setRotation(currentRotation + diff * 0.2);
                }
            }
        });
    }
}