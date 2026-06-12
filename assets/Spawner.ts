import { _decorator, Component, Prefab, instantiate, math, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Spawner')
export class Spawner extends Component {
    
    // ==========================================
    // БЛОК 1: НАСТРОЙКИ ФИНИША (НОВОЕ)
    // ==========================================
    @property({ type: Prefab, tooltip: 'Префаб Финишной Линии' })
    finishLinePrefab: Prefab = null;

    @property({ tooltip: 'Через сколько секунд появится финиш' })
    timeToFinish: number = 15.0;

    private totalGameTime: number = 0;
    private isFinishSpawned: boolean = false;

    // ==========================================
    // БЛОК 2: НАСТРОЙКИ ВРАГОВ
    // ==========================================
    @property({ type: [Prefab], tooltip: 'Враги (Сначала Бандит, потом Конус)' })
    obstaclePrefabs: Prefab[] = [];

    @property({ type: Node })
    obstaclesContainer: Node = null;

    @property
    obstacleIntervalMin: number = 1.5;
    
    @property
    obstacleIntervalMax: number = 3.0;

    private obstacleTimer: number = 0;
    private currentObstacleInterval: number = 0;
    private isFirstSpawn: boolean = true;

    // ==========================================
    // БЛОК 3: НАСТРОЙКИ ДЕНЕГ
    // ==========================================
    @property({ type: [Prefab], tooltip: 'Купюра и PayPal Cash' })
    lootPrefabs: Prefab[] = [];

    @property({ type: Node })
    lootContainer: Node = null;

    @property
    lootIntervalMin: number = 2.0;
    
    @property
    lootIntervalMax: number = 5.0;

    private lootTimer: number = 0;
    private currentLootInterval: number = 0;

    onLoad() {
        this.setNextObstacleInterval();
        this.setNextLootInterval();
    }

    update(deltaTime: number) {
        // Увеличиваем общее время игры
        this.totalGameTime += deltaTime;

        // 1. ПРОВЕРКА НА ФИНИШ (Если прошло 15 секунд)
        if (this.totalGameTime >= this.timeToFinish && !this.isFinishSpawned) {
            this.spawnFinishLine();
            this.isFinishSpawned = true;
            return; // Спавнер засыпает навсегда, больше ничего не создаем
        }

        // 2. ОЧИСТКА ПУТИ (За 3 секунды до финиша прекращаем спавн всего)
        // 3 секунды * 300 скорости = 900 пикселей пустого пространства перед финишем!
        if (this.totalGameTime >= this.timeToFinish - 3.0) {
            return; 
        }

        // 3. ОБЫЧНЫЙ СПАВН ВРАГОВ
        this.obstacleTimer += deltaTime;
        if (this.obstacleTimer >= this.currentObstacleInterval) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
            this.setNextObstacleInterval();
        }

        // 4. ОБЫЧНЫЙ СПАВН ДЕНЕГ
        this.lootTimer += deltaTime;
        if (this.lootTimer >= this.currentLootInterval) {
            this.spawnLootPattern();
            this.lootTimer = 0;
            this.setNextLootInterval();
        }
    }

    // НОВЫЙ МЕТОД: Спавн финиша
    spawnFinishLine() {
        if (!this.finishLinePrefab || !this.obstaclesContainer) return;

        let finish = instantiate(this.finishLinePrefab);
        this.obstaclesContainer.addChild(finish);
        
        // Появляется справа за экраном, высоту можно настроить (-40 как у врагов)
        finish.setPosition(1200, -40, 0); 
    }

    spawnObstacle() {
        if (this.obstaclePrefabs.length === 0 || !this.obstaclesContainer) return;

        let prefabToSpawn;

        if (this.isFirstSpawn) {
            prefabToSpawn = this.obstaclePrefabs[0]; 
            this.isFirstSpawn = false;
        } else {
            let randomIndex = math.randomRangeInt(0, this.obstaclePrefabs.length);
            prefabToSpawn = this.obstaclePrefabs[randomIndex];
        }

        let obstacle = instantiate(prefabToSpawn);
        this.obstaclesContainer.addChild(obstacle);
        
        let lowerY = obstacle.position.y - 40; 
        obstacle.setPosition(1200, lowerY, 0); 
    }

    spawnLootPattern() {
        if (this.lootPrefabs.length === 0 || !this.lootContainer) return;

        let patternType = math.randomRangeInt(0, 4); 
        let startX = 1200; 
        let startY = 0;   
        let dx = 70;       
        let dy = 60;       

        let points = [];

        if (patternType === 0) points.push({ x: 0, y: 0 }); 
        else if (patternType === 1) points.push({ x: 0, y: 0 }, { x: dx, y: dy }, { x: dx*2, y: 0 });
        else if (patternType === 2) points.push({ x: 0, y: 0 }, { x: dx, y: dy }, { x: dx*2, y: dy*2 }, { x: dx*3, y: dy }, { x: dx*4, y: 0 });
        else if (patternType === 3) points.push({ x: 0, y: 0 }, { x: dx, y: dy }, { x: dx*2, y: dy*2 }, { x: dx*3, y: dy*3 }, { x: dx*4, y: dy*2 }, { x: dx*5, y: dy }, { x: dx*6, y: 0 });

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