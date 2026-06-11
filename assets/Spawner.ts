import { _decorator, Component, Prefab, instantiate, math, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Spawner') // <-- Вот здесь не хватало двух букв 'c'
export class Spawner extends Component {
    @property({ type: [Prefab], tooltip: 'Префабы конуса и бандита' })
    obstaclePrefabs: Prefab[] = [];

    @property({ type: Node, tooltip: 'Перетащи сюда ноду obstacles из Иерархии' })
    obstaclesContainer: Node = null;

    @property
    spawnIntervalMin: number = 1.5;
    
    @property
    spawnIntervalMax: number = 3.0;

    private timer: number = 0;
    private currentInterval: number = 0;

    start() {
        this.setNextInterval();
    }

    update(deltaTime: number) {
        this.timer += deltaTime;
        if (this.timer >= this.currentInterval) {
            this.spawnObstacle();
            this.timer = 0;
            this.setNextInterval();
        }
    }

    spawnObstacle() {
        if (this.obstaclePrefabs.length === 0 || !this.obstaclesContainer) return;

        let randomIndex = math.randomRangeInt(0, this.obstaclePrefabs.length);
        let prefabToSpawn = this.obstaclePrefabs[randomIndex];

        let obstacle = instantiate(prefabToSpawn);
        this.obstaclesContainer.addChild(obstacle);
        obstacle.setPosition(1200, obstacle.position.y, 0);
    }

    setNextInterval() {
        this.currentInterval = math.randomRange(this.spawnIntervalMin, this.spawnIntervalMax);
    }
}