import { Room, Client } from "colyseus";
import { GameState, Player, PowerUp, Bullet, InputData } from "./Part4State";

export class Part4Room extends Room<GameState> {
  fixedTimeStep = 1000 / 60;
  maxClients = 50;
  BULLET_SPEED = 10;
  COLORS = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];
  private readonly ROTATION_SPEED = 0.05;
  private readonly THRUST_FORCE = 0.1;
  private readonly MAX_VELOCITY = 4;
  private readonly DRAG = 0.99; // Slight drag for better control

  onCreate() {
    this.setState(new GameState());
    this.setPatchRate(1000 / 60); // Sync at 60Hz
    this.setupMessageHandlers();
    this.setupGameLoop();
    this.spawnInitialPowerUps();
  }

  setupMessageHandlers() {
    this.onMessage(0, (client, input: InputData) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.inputQueue.push(input);
      }
    });
  }

  setupGameLoop() {
    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;
      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
  }

  spawnInitialPowerUps() {
    const types: Array<"health" | "firerate" | "speed"> = ["health", "firerate", "speed"];
    for (let i = 0; i < 20; i++) {
      this.spawnPowerUp(types[Math.floor(Math.random() * types.length)]);
    }
  }

  spawnPowerUp(type: "health" | "firerate" | "speed") {
    const powerUp = new PowerUp();
    powerUp.x = Math.random() * this.state.mapWidth;
    powerUp.y = Math.random() * this.state.mapHeight;
    powerUp.type = type;

    switch (type) {
      case "health": powerUp.value = 50; break;
      case "firerate": powerUp.value = 0.2; break;
      case "speed": powerUp.value = 1; break;
    }

    this.state.powerUps.set(Math.random().toString(), powerUp);
  }

  fixedTick(timeStep: number) {
    // Update players
    this.state.players.forEach((player, sessionId) => {
      this.processPlayerInput(player);
      this.checkPowerUpCollisions(player, sessionId);
    });

    // Update bullets
    const bulletsToRemove = new Set<string>();

    this.state.bullets.forEach((bullet, bulletId) => {
      bullet.x += bullet.velocityX;
      bullet.y += bullet.velocityY;

      // Check for out of bounds
      if (bullet.x < 0 || bullet.x > this.state.mapWidth ||
        bullet.y < 0 || bullet.y > this.state.mapHeight) {
        bulletsToRemove.add(bulletId);
        return;
      }

      // Check bullet collisions
      let bulletHit = false;
      this.state.players.forEach((player, playerId) => {
        if (!bulletHit && bullet.ownerId !== playerId && this.checkCollision(bullet, player)) {
          player.health -= 25;
          bulletHit = true;
          bulletsToRemove.add(bulletId);

          if (player.health <= 0) {
            this.handlePlayerDeath(player, playerId, bullet.ownerId);
          }
        }
      });
    });

    // Remove all bullets marked for deletion
    bulletsToRemove.forEach(bulletId => {
      this.state.bullets.delete(bulletId);
    });
  }

  processPlayerInput(player: Player) {
    while (player.inputQueue.length > 0) {
      const input = player.inputQueue.shift();
      if (!input) continue;

      // Normalize rotation between 0 and 2π
      if (input.left) {
        player.rotation = (player.rotation - this.ROTATION_SPEED + Math.PI * 2) % (Math.PI * 2);
      }
      if (input.right) {
        player.rotation = (player.rotation + this.ROTATION_SPEED) % (Math.PI * 2);
      }

      // Thrust
      if (input.up) {
        const thrustX = Math.sin(player.rotation) * this.THRUST_FORCE;
        const thrustY = -Math.cos(player.rotation) * this.THRUST_FORCE;

        player.velocityX += thrustX;
        player.velocityY += thrustY;

        // Clamp velocity
        const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
        if (speed > this.MAX_VELOCITY) {
          const scale = this.MAX_VELOCITY / speed;
          player.velocityX *= scale;
          player.velocityY *= scale;
        }
      }

      // Brake
      if (input.down) {
        player.velocityX *= 0.95;
        player.velocityY *= 0.95;
      }

      // Calculate next position
      let nextX = player.x + player.velocityX;
      let nextY = player.y + player.velocityY;

      // Check boundaries and stop velocity if hitting edge
      const BUFFER = 20; // Buffer from the edge
      if (nextX < BUFFER) {
        nextX = BUFFER;
        player.velocityX = 0;
      } else if (nextX > this.state.mapWidth - BUFFER) {
        nextX = this.state.mapWidth - BUFFER;
        player.velocityX = 0;
      }

      if (nextY < BUFFER) {
        nextY = BUFFER;
        player.velocityY = 0;
      } else if (nextY > this.state.mapHeight - BUFFER) {
        nextY = this.state.mapHeight - BUFFER;
        player.velocityY = 0;
      }

      // Update position
      player.x = nextX;
      player.y = nextY;

      // Apply drag
      player.velocityX *= this.DRAG;
      player.velocityY *= this.DRAG;

      // Shooting
      if (input.shooting && Date.now() - player.lastShotTime > 1000 / player.fireRate) {
        this.createBullet(player);
        player.lastShotTime = Date.now();
      }

      player.tick = input.tick;
    }
  }

  createBullet(player: Player) {
    const bullet = new Bullet();
    bullet.x = player.x;
    bullet.y = player.y;
    bullet.ownerId = player.sessionId;

    // Bullet inherits player velocity plus additional speed in facing direction
    const bulletSpeed = this.BULLET_SPEED;
    bullet.velocityX = Math.sin(player.rotation) * bulletSpeed + (player.velocityX * 0.5);
    bullet.velocityY = -Math.cos(player.rotation) * bulletSpeed + (player.velocityY * 0.5);

    this.state.bullets.set(Math.random().toString(), bullet);
  }

  checkPowerUpCollisions(player: Player, playerId: string) {
    this.state.powerUps.forEach((powerUp, powerUpId) => {
      if (this.checkCollision(player, powerUp)) {
        this.broadcast("powerUpCollected", {
          playerId,
          type: powerUp.type,
          value: powerUp.value,
          x: powerUp.x,
          y: powerUp.y
        });
        this.applyPowerUp(player, powerUp);
        this.state.powerUps.delete(powerUpId);
        this.spawnPowerUp(powerUp.type);
      }
    });
  }

  applyPowerUp(player: Player, powerUp: PowerUp) {
    switch (powerUp.type) {
      case "health":
        player.health = Math.min(100, player.health + powerUp.value);
        break;
      case "firerate":
        player.fireRate += powerUp.value;
        break;
      case "speed":
        player.speed += powerUp.value;
        break;
    }
  }

  handlePlayerDeath(player: Player, playerId: string, killerSessionId: string) {
    // Drop power-ups
    const dropCount = Math.min(5, Math.floor(player.kills / 2));
    for (let i = 0; i < dropCount; i++) {
      const powerUp = new PowerUp();
      powerUp.x = player.x + (Math.random() * 50 - 25);
      powerUp.y = player.y + (Math.random() * 50 - 25);
      powerUp.type = ["health", "firerate", "speed"][Math.floor(Math.random() * 4)] as any;
      this.state.powerUps.set(Math.random().toString(), powerUp);
    }

    // Increment killer's kills
    const killer = this.state.players.get(killerSessionId);
    if (killer) {
      killer.kills++;
      if (killer.kills >= 100) {
        this.broadcast("gameOver", { winner: killerSessionId });
        this.disconnect();
      }
    }

    // Reset dead player
    player.health = 100;
    player.fireRate = 1;
    player.speed = 5;
    player.x = Math.random() * this.state.mapWidth;
    player.y = Math.random() * this.state.mapHeight;
  }

  checkCollision(obj1: { x: number, y: number }, obj2: { x: number, y: number }): boolean {
    const distance = Math.sqrt(
      Math.pow(obj1.x - obj2.x, 2) + Math.pow(obj1.y - obj2.y, 2)
    );
    return distance < 15; // Collision radius
  }

  onJoin(client: Client, options: any) {
    const { username } = options
    const player = new Player();
    player.x = Math.random() * this.state.mapWidth;
    player.y = Math.random() * this.state.mapHeight;
    player.userName = username;
    player.color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    player.sessionId = client.sessionId;
    this.state.players.set(client.sessionId, player);
    console.log(`Player ${player.userName} has joined!`)
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    console.log(`Player ${client.sessionId} has left!`)
  }
}