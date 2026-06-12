import { _decorator, Component, Prefab, instantiate, math, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Spawner')
export class Spawner extends Component {
    
    // ==========================================
    // БЛОК 1: НАСТРОЙКИ ВРАГОВ
    // ==========================================
    @property({ type: [Prefab], tooltip: 'Враги (Бандит, Конус)' })
    obstaclePrefabs: Prefab[] = [];

    @property({ type: Node })
    obstaclesContainer: Node = null;

    @property({ tooltip: 'Минимальное время между врагами' })
    obstacleIntervalMin: number = 1.5;
    
    @property({ tooltip: 'Максимальное время между врагами' })
    obstacleIntervalMax: number = 3.0;

    // Таймеры врагов
    private obstacleTimer: number = 0;
    private currentObstacleInterval: number = 0;


    // ==========================================
    // БЛОК 2: НАСТРОЙКИ ДЕНЕГ
    // ==========================================
    @property({ type: [Prefab], tooltip: 'Купюра и PayPal Cash' })
    lootPrefabs: Prefab[] = [];

    @property({ type: Node })
    lootContainer: Node = null;

    @property({ tooltip: 'Минимальное время между пирамидами денег' })
    lootIntervalMin: number = 2.0;
    
    @property({ tooltip: 'Максимальное время между пирамидами денег' })
    lootIntervalMax: number = 5.0;

    // Таймеры денег
    private lootTimer: number = 0;
    private currentLootInterval: number = 0;


    // ==========================================
    // ОСНОВНАЯ ЛОГИКА
    // ==========================================
    onLoad() {
        // Запускаем оба таймера
        this.setNextObstacleInterval();
        this.setNextLootInterval();
    }

    update(deltaTime: number) {
        // 1. Независимый отсчет для ВРАГОВ
        this.obstacleTimer += deltaTime;
        if (this.obstacleTimer >= this.currentObstacleInterval) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
            this.setNextObstacleInterval();
        }

        // 2. Независимый отсчет для ДЕНЕГ
        this.lootTimer += deltaTime;
        if (this.lootTimer >= this.currentLootInterval) {
            this.spawnLootPattern();
            this.lootTimer = 0;
            this.setNextLootInterval();
        }
    }

    spawnObstacle() {
        if (this.obstaclePrefabs.length === 0 || !this.obstaclesContainer) return;

        let randomIndex = math.randomRangeInt(0, this.obstaclePrefabs.length);
        let obstacle = instantiate(this.obstaclePrefabs[randomIndex]);
        this.obstaclesContainer.addChild(obstacle);
        obstacle.setPosition(1200, obstacle.position.y, 0); 
    }

    spawnLootPattern() {
        if (this.lootPrefabs.length === 0 || !this.lootContainer) return;

        let patternType = math.randomRangeInt(0, 4); 
        let startX = 1200; 
        let startY = 40;   
        let dx = 70;       
        let dy = 60;       

        let points = [];

        if (patternType === 0) {
            points.push({ x: 0, y: 0 }); 
        } else if (patternType === 1) {
            points.push({ x: 0, y: 0 }, { x: dx, y: dy }, { x: dx*2, y: 0 });
        } else if (patternType === 2) {
            points.push({ x: 0, y: 0 }, { x: dx, y: dy }, { x: dx*2, y: dy*2 }, { x: dx*3, y: dy }, { x: dx*4, y: 0 });
        } else if (patternType === 3) {
            points.push({ x: 0, y: 0 }, { x: dx, y: dy }, { x: dx*2, y: dy*2 }, { x: dx*3, y: dy*3 }, { x: dx*4, y: dy*2 }, { x: dx*5, y: dy }, { x: dx*6, y: 0 });
        }

        for (let i = 0; i < points.length; i++) {
            let randomIndex = math.randomRangeInt(0, this.lootPrefabs.length);
            let prefab = this.lootPrefabs[randomIndex];
            
            let loot = instantiate(prefab);
            this.lootContainer.addChild(loot);
            loot.setPosition(startX + points[i].x, startY + points[i].y, 0);
        }
    }

    setNextObstacleInterval() {
        this.currentObstacleInterval = math.randomRange(this.obstacleIntervalMin, this.obstacleIntervalMax);
    }

    setNextLootInterval() {
        this.currentLootInterval = math.randomRange(this.lootIntervalMin, this.lootIntervalMax);
    }
}