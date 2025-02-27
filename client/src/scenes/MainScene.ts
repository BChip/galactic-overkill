import Phaser from "phaser";
import { Room, Client } from "colyseus.js";
import { GameState, Player } from "../../../server/src/rooms/Part4State";
import { StarfieldConfig, StarfieldManager } from "../managers/starfieldmanager";

interface FloatingText {
    text: Phaser.GameObjects.Text;
    startTime: number;
    duration: number;
}

export class MainScene extends Phaser.Scene {
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
    private username: string;
    private forwardThrusterManager!: Phaser.GameObjects.Particles.ParticleEmitterManager;
    private playerPrevPositions: { [sessionId: string]: { x: number, y: number } } = {};
    private powerUpGlows: { [powerUpId: string]: Phaser.GameObjects.Particles.ParticleEmitterManager } = {};

    constructor() {
        super({ key: "MainScene" });
    }

    init(data: { username: string }) {
        this.username = data.username;
        console.log('Player username:', this.username);
    }

    preload() {

    }

    // Enhanced power-up glow implementation
    addGlowToPowerUp(powerUpId: string, powerUp: any, rect: Phaser.GameObjects.Rectangle) {
        // Define colors for different power-up types with more vibrant colors
        const glowColors = {
            health: 0xff3333,      // Brighter red for health
            firerate: 0x33ff33,    // Brighter green for fire rate
            speed: 0x3333ff,       // Brighter blue for speed
        };

        // Create a more visible glow effect
        const glowEmitter = this.add.particles(powerUp.x, powerUp.y, 'particle', {
            speed: { min: 5, max: 15 },        // Slight outward drift
            scale: { start: 3.0, end: 1.0 },   // Larger particles
            alpha: { start: 0.7, end: 0 },     // Higher starting alpha
            lifespan: 1000,                    // Shorter lifespan for more activity
            blendMode: 'ADD',                  // ADD blend mode for glow
            tint: glowColors[powerUp.type],
            gravityY: 0,
            quantity: 1,                       // Emit two particles at once
            frequency: 100                     // Emit more frequently
        });

        // Add emitter to world container and ensure it's behind the power-up
        this.worldContainer.add(glowEmitter);
        // Make sure the power-up is on top
        this.worldContainer.bringToTop(rect);

        // Store reference to emitter
        this.powerUpGlows[powerUpId] = glowEmitter;

        // Create a more active emission pattern
        this.time.addEvent({
            delay: 50,  // Update more frequently (50ms)
            loop: true,
            callback: () => {
                // Check if the power-up and emitter still exist
                if (this.powerUps[powerUpId] && glowEmitter) {
                    // Create a circular pattern of particles around the power-up
                    // This makes the glow effect more visible
                    const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
                    const distance = Phaser.Math.Between(0, 10);
                    const offsetX = Math.cos(angle) * distance;
                    const offsetY = Math.sin(angle) * distance;

                    glowEmitter.emitParticleAt(offsetX, offsetY, 2);
                } else {
                    return false;  // Stops the timer
                }
            }
        });

        // Add a more pronounced pulsating effect
        this.tweens.add({
            targets: rect,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add a secondary glow effect using a circular sprite
        // This creates a more persistent visible glow under the power-up
        const glowCircle = this.add.circle(0, 0, 15, glowColors[powerUp.type], 0.3);
        glowCircle.setBlendMode(Phaser.BlendModes.ADD);

        // Add the circle to the world container, ensuring it's behind the power-up
        this.worldContainer.add(glowCircle);
        this.worldContainer.sendToBack(glowCircle);

        // Make the glow circle follow the power-up
        this.time.addEvent({
            delay: 16,  // Update every frame
            loop: true,
            callback: () => {
                if (this.powerUps[powerUpId]) {
                    glowCircle.setPosition(this.powerUps[powerUpId].x, this.powerUps[powerUpId].y);
                } else {
                    glowCircle.destroy();
                    return false;
                }
            }
        });

        return glowEmitter;
    }

    createThrusterEffect() {
        // Create standard thruster effect
        this.particleManagers['thruster'] = this.add.particles(0, 0, 'particle', {
            speed: { min: 50, max: 100 },
            angle: { min: 140, max: 300 }, // Wide angle range
            scale: { start: 1.0, end: 0 },
            lifespan: { min: 150, max: 250 },
            blendMode: 'ADD',
            tint: [0xffdd00, 0xff9900, 0xff6600], // More yellowish flame
            gravityY: 0,
            frequency: -1, // Manual emit only
            reserve: 40 // Particle pool size
        });

        // Create forward thruster with more intense effect
        this.forwardThrusterManager = this.add.particles(0, 0, 'particle', {
            speed: { min: 50, max: 100 },
            angle: { min: 140, max: 300 }, // Wide angle range
            scale: { start: 1.0, end: 0 },
            lifespan: { min: 150, max: 250 },
            blendMode: 'ADD',
            tint: [0xffdd00, 0xff9900, 0xff6600], // More yellowish flame
            gravityY: 0,
            frequency: -1, // Manual emit only
            reserve: 40 // Particle pool size
        });

        // Add both particle managers to world container
        this.worldContainer.add(this.particleManagers['thruster']);
        this.worldContainer.add(this.forwardThrusterManager);
    }

    updateAllPlayerThrusters() {
        if (!this.room || !this.particleManagers['thruster'] || !this.forwardThrusterManager) return;

        // Update thruster for local player
        this.updateLocalPlayerThruster();

        // Update thrusters for other players
        this.updateRemotePlayerThrusters();
    }

    updateLocalPlayerThruster() {
        if (!this.player) return;

        // Get player position and rotation
        const { x, y, rotation } = this.player;

        // Calculate thruster position at the base center of the triangle
        const rearOffset = 0;
        const thrusterX = x - Math.cos(rotation) * rearOffset;
        const thrusterY = y - Math.sin(rotation) * rearOffset;

        // Check if player is moving
        const isMoving = this.keys.up.isDown || this.keys.down.isDown ||
            this.keys.left.isDown || this.keys.right.isDown;

        // Emit particles if moving
        if (isMoving) {
            if (this.keys.up.isDown) {
                // Forward movement - more intense particles
                this.forwardThrusterManager.emitParticleAt(
                    thrusterX,
                    thrusterY,
                    3 // Emit 3 particles
                );
            }
        }

        // Store current position for next frame
        this.playerPrevPositions[this.room.sessionId] = { x, y };
    }

    updateRemotePlayerThrusters() {
        this.room.state.players.forEach((player, sessionId) => {
            // Skip local player (already handled)
            if (sessionId === this.room.sessionId) return;

            const entity = this.playerEntities[sessionId];
            if (!entity || !entity.active) return;

            const { x, y, rotation } = entity;

            // Calculate thruster position
            const rearOffset = 0;
            const thrusterX = x - Math.cos(rotation) * rearOffset;
            const thrusterY = y - Math.sin(rotation) * rearOffset;

            // Check if this player is moving by comparing current to previous position
            const prevPos = this.playerPrevPositions[sessionId] || { x, y };
            const dx = x - prevPos.x;
            const dy = y - prevPos.y;
            const distanceMoved = Math.sqrt(dx * dx + dy * dy);

            // Only show thruster if player has moved enough
            const isMoving = distanceMoved > 3;

            if (isMoving) {
                // Determine if player is moving forward
                // Calculate dot product between movement and facing direction
                const moveAngle = Math.atan2(dy, dx);
                const facingVector = { x: Math.cos(rotation), y: Math.sin(rotation) };
                const moveVector = { x: Math.cos(moveAngle), y: Math.sin(moveAngle) };
                const dotProduct = facingVector.x * moveVector.x + facingVector.y * moveVector.y;

                // Forward movement if dot product is positive (vectors pointing in similar direction)
                const isForward = dotProduct > 3;

                if (isForward) {
                    // Forward movement - more intense particles
                    this.forwardThrusterManager.emitParticleAt(
                        thrusterX,
                        thrusterY,
                        6 // Fewer particles for remote players (network optimization)
                    );
                } else {
                    // Other movement - standard thruster
                    this.particleManagers['thruster'].emitParticleAt(
                        thrusterX,
                        thrusterY,
                        6
                    );
                }
            }

            // Store current position for next frame
            this.playerPrevPositions[sessionId] = { x, y };
        });
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

        this.createThrusterEffect();

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
            this.room = await client.joinOrCreate<GameState>("game", { "username": this.username });
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
            leaderboardText += `${rank}. ${player.userName} - Kills: ${player.kills}\n`;
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

            // Create the power-up rectangle
            const rect = this.add.rectangle(powerUp.x, powerUp.y, 15, 15);
            rect.setOrigin(0.5, 0.5);  // Set origin to center for scaling

            // Add to world container
            this.worldContainer.add(rect);
            this.powerUps[powerUpId] = rect;

            // Add glow effect
            this.addGlowToPowerUp(powerUpId, powerUp, rect);
        });

        this.room.state.powerUps.onRemove((powerUp, powerUpId) => {
            const entity = this.powerUps[powerUpId];
            if (entity) {
                entity.destroy();
                delete this.powerUps[powerUpId];
            }

            // Clean up the glow emitter
            const glowEmitter = this.powerUpGlows[powerUpId];
            if (glowEmitter) {
                glowEmitter.destroy();
                delete this.powerUpGlows[powerUpId];
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

        this.updateAllPlayerThrusters();

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