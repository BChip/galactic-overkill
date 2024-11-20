import Phaser from 'phaser';

interface StarfieldLayer {
    sprite: Phaser.GameObjects.TileSprite;
    speed: number;
}

interface StarLayerConfig {
    starCount: number;
    minSize: number;
    maxSize: number;
    colors: string[];
    alpha: number;
    speed: number;
    lensFlareChance?: number;
}

export interface StarfieldConfig {
    backgroundColor: string;
    layers: {
        background: StarLayerConfig;
        midground: StarLayerConfig;
        foreground: StarLayerConfig;
    };
}

const DEFAULT_CONFIG: StarfieldConfig = {
    backgroundColor: '#000000',
    layers: {
        background: {
            starCount: 200,
            minSize: 0.5,
            maxSize: 1,
            colors: ['#465677', '#6783b3', '#8490b0'],
            alpha: 1,
            speed: 0.1,
            lensFlareChance: 0
        },
        midground: {
            starCount: 100,
            minSize: 1,
            maxSize: 2,
            colors: ['#738bbf', '#a2b7df', '#c2d0e8'],
            alpha: 0.8,
            speed: 0.2,
            lensFlareChance: 0.05
        },
        foreground: {
            starCount: 50,
            minSize: 1.5,
            maxSize: 3,
            colors: ['#ffffff', '#eeeeff', '#ddddff'],
            alpha: 0.6,
            speed: 0.3,
            lensFlareChance: 0.1
        }
    }
};

const DEEP_SPACE_CONFIG: StarfieldConfig = {
    backgroundColor: '#000000',
    layers: {
        background: {
            starCount: 300,
            minSize: 0.3,
            maxSize: 0.8,
            colors: ['#1a1a1a', '#2a2a2a', '#3a3a3a'],
            alpha: 1,
            speed: 0.05
        },
        midground: {
            starCount: 150,
            minSize: 0.8,
            maxSize: 1.5,
            colors: ['#4a4a4a', '#5a5a5a', '#6a6a6a'],
            alpha: 0.9,
            speed: 0.15,
            lensFlareChance: 0.02
        },
        foreground: {
            starCount: 75,
            minSize: 1.2,
            maxSize: 2,
            colors: ['#8a8a8a', '#9a9a9a', '#aaaaaa'],
            alpha: 0.8,
            speed: 0.25,
            lensFlareChance: 0.05
        }
    }
};

// Nebula theme (colorful, vibrant)
const NEBULA_CONFIG: StarfieldConfig = {
    backgroundColor: '#0a0a15',
    layers: {
        background: {
            starCount: 250,
            minSize: 0.5,
            maxSize: 1.2,
            colors: ['#ff3366', '#3366ff', '#33ff66'],
            alpha: 0.3,
            speed: 0.08
        },
        midground: {
            starCount: 125,
            minSize: 1,
            maxSize: 2,
            colors: ['#ff66cc', '#66ccff', '#66ffcc'],
            alpha: 0.5,
            speed: 0.16,
            lensFlareChance: 0.08
        },
        foreground: {
            starCount: 60,
            minSize: 1.5,
            maxSize: 2.5,
            colors: ['#ffffff', '#ffccff', '#ccffff'],
            alpha: 0.7,
            speed: 0.24,
            lensFlareChance: 0.15
        }
    }
};

export enum StarfieldTheme {
    DEFAULT = 'DEFAULT',
    DEEP_SPACE = 'DEEP_SPACE',
    NEBULA = 'NEBULA'
}

function getRandomConfig(): StarfieldConfig {
    const configs = {
        [StarfieldTheme.DEFAULT]: DEFAULT_CONFIG,
        [StarfieldTheme.DEEP_SPACE]: DEEP_SPACE_CONFIG,
        [StarfieldTheme.NEBULA]: NEBULA_CONFIG
    };

    const themes = Object.values(StarfieldTheme);
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    return configs[randomTheme];
}

export class StarfieldManager {
    private layers: StarfieldLayer[] = [];
    private readonly scene: Phaser.Scene;
    private readonly width: number;
    private readonly height: number;
    private readonly config: StarfieldConfig;
    private currentTheme: StarfieldTheme;

    constructor(scene: Phaser.Scene, width: number, height: number, config?: Partial<StarfieldConfig>) {
        this.scene = scene;
        this.width = width;
        this.height = height;

        // If no config provided, get a random one
        const baseConfig = config ? DEFAULT_CONFIG : getRandomConfig();
        this.config = this.mergeConfig(baseConfig, config || {});

        // Store the current theme for reference
        this.currentTheme = this.determineTheme(this.config);

        this.createStarfieldLayers();
    }

    private mergeConfig(defaultConfig: StarfieldConfig, userConfig: Partial<StarfieldConfig>): StarfieldConfig {
        return {
            backgroundColor: userConfig.backgroundColor ?? defaultConfig.backgroundColor,
            layers: {
                background: { ...defaultConfig.layers.background, ...userConfig.layers?.background },
                midground: { ...defaultConfig.layers.midground, ...userConfig.layers?.midground },
                foreground: { ...defaultConfig.layers.foreground, ...userConfig.layers?.foreground }
            }
        };
    }

    public getCurrentTheme(): StarfieldTheme {
        return this.currentTheme;
    }

    private determineTheme(config: StarfieldConfig): StarfieldTheme {
        if (JSON.stringify(config) === JSON.stringify(DEEP_SPACE_CONFIG)) return StarfieldTheme.DEEP_SPACE;
        if (JSON.stringify(config) === JSON.stringify(NEBULA_CONFIG)) return StarfieldTheme.NEBULA;
        return StarfieldTheme.DEFAULT;
    }

    private createStarTexture(key: string, layerConfig: StarLayerConfig, backgroundColor: string = 'rgba(0, 0, 0, 0)') {
        const graphics = this.scene.add.graphics();
        const texture = this.scene.textures.createCanvas(key, 256, 256);
        const canvas = texture.getCanvas();
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // Set background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, 256, 256);

            // Create stars
            for (let i = 0; i < layerConfig.starCount; i++) {
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                const radius = Phaser.Math.FloatBetween(layerConfig.minSize, layerConfig.maxSize);

                // Create gradient for glowing effect
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                const color = Phaser.Utils.Array.GetRandom(layerConfig.colors);
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.4, Phaser.Display.Color.HexStringToColor(color).rgba);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Add lens flare based on chance
                if (Math.random() < (layerConfig.lensFlareChance ?? 0)) {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(x - radius * 2, y);
                    ctx.lineTo(x + radius * 2, y);
                    ctx.moveTo(x, y - radius * 2);
                    ctx.lineTo(x, y + radius * 2);
                    ctx.stroke();
                }
            }
        }

        texture.refresh();
        graphics.destroy();
    }

    private createStarfieldLayers() {
        // Create textures
        this.createStarTexture('starfield-bg', this.config.layers.background, this.config.backgroundColor);
        this.createStarTexture('starfield-mid', this.config.layers.midground);
        this.createStarTexture('starfield-fg', this.config.layers.foreground);

        // Create layers
        const layerConfigs = [
            { key: 'starfield-bg', config: this.config.layers.background },
            { key: 'starfield-mid', config: this.config.layers.midground },
            { key: 'starfield-fg', config: this.config.layers.foreground }
        ];

        layerConfigs.forEach(({ key, config }) => {
            const sprite = this.scene.add.tileSprite(0, 0, this.width, this.height, key)
                .setOrigin(0)
                .setAlpha(config.alpha)
                .setScrollFactor(0);

            this.layers.push({
                sprite,
                speed: config.speed
            });
        });
    }

    public update(playerVelocityX: number, playerVelocityY: number) {
        this.layers.forEach(layer => {
            layer.sprite.tilePositionX += playerVelocityX * layer.speed;
            layer.sprite.tilePositionY += playerVelocityY * layer.speed;
        });
    }

    public getLayers(): Phaser.GameObjects.TileSprite[] {
        return this.layers.map(layer => layer.sprite);
    }

    public destroy() {
        this.layers.forEach(layer => layer.sprite.destroy());
        this.layers = [];
    }
}