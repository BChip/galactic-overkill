"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = exports.Player = exports.Bullet = exports.PowerUp = void 0;
const schema_1 = require("@colyseus/schema");
class PowerUp extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.ownerId = "";
    }
}
__decorate([
    (0, schema_1.type)("number")
], PowerUp.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number")
], PowerUp.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string")
], PowerUp.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("number")
], PowerUp.prototype, "value", void 0);
__decorate([
    (0, schema_1.type)("string")
], PowerUp.prototype, "ownerId", void 0);
exports.PowerUp = PowerUp;
// In GameState.ts or Part4State.ts
class Bullet extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.ownerId = "";
    }
}
__decorate([
    (0, schema_1.type)("number")
], Bullet.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number")
], Bullet.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number")
], Bullet.prototype, "velocityX", void 0);
__decorate([
    (0, schema_1.type)("number")
], Bullet.prototype, "velocityY", void 0);
__decorate([
    (0, schema_1.type)("string")
], Bullet.prototype, "ownerId", void 0);
exports.Bullet = Bullet;
// Update Player schema with velocity and rotation properties
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
        this.health = 100;
        this.kills = 0;
        this.fireRate = 1;
        this.speed = 5;
        this.lastShotTime = 0;
        this.inputQueue = [];
    }
}
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "rotation", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "velocityX", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "velocityY", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "angularVelocity", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "health", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "kills", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "fireRate", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "speed", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "lastShotTime", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "tick", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "sessionId", void 0);
exports.Player = Player;
class GameState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.mapWidth = 2000;
        this.mapHeight = 2000;
        this.players = new schema_1.MapSchema();
        this.powerUps = new schema_1.MapSchema();
        this.bullets = new schema_1.MapSchema();
    }
}
__decorate([
    (0, schema_1.type)("number")
], GameState.prototype, "mapWidth", void 0);
__decorate([
    (0, schema_1.type)("number")
], GameState.prototype, "mapHeight", void 0);
__decorate([
    (0, schema_1.type)({ map: Player })
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: PowerUp })
], GameState.prototype, "powerUps", void 0);
__decorate([
    (0, schema_1.type)({ map: Bullet })
], GameState.prototype, "bullets", void 0);
exports.GameState = GameState;
