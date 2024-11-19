import { Schema, Context, type, MapSchema } from "@colyseus/schema";

export interface InputData {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shooting: boolean;
  tick: number;
}

export class PowerUp extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("string") type: "health" | "firerate" | "speed";
  @type("number") value: number;
  @type("string") ownerId: string = "";
}

// In GameState.ts or Part4State.ts
export class Bullet extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") velocityX: number = 0;
  @type("number") velocityY: number = 0;
  @type("string") ownerId: string = "";
}
// Update Player schema with velocity and rotation properties
export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("number") velocityX: number = 0;
  @type("number") velocityY: number = 0;
  @type("number") angularVelocity: number = 0;
  @type("number") health = 100;
  @type("number") kills = 0;
  @type("number") fireRate = 1;
  @type("number") speed = 5;
  @type("number") lastShotTime = 0;
  @type("number") tick: number;
  @type("string") color: string;
  @type("string") sessionId: string;

  inputQueue: InputData[] = [];
}

export class GameState extends Schema {
  @type("number") mapWidth = 2000;
  @type("number") mapHeight = 2000;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: PowerUp }) powerUps = new MapSchema<PowerUp>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
}