import { _decorator, Component, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Obstacle')
export class Obstacle extends Component {
    @property({ tooltip: 'Скорость движения препятствия' })
    speed: number = 600; // Скорость должна примерно совпадать со скоростью фона
    

    update(deltaTime: number) {
        // Двигаем препятствие влево каждый кадр
        let dx = this.speed * deltaTime;
        this.node.setPosition(this.node.position.x - dx, this.node.position.y, 0);

        // Если объект уехал далеко за левый край экрана — удаляем его (очищаем память)
        if (this.node.position.x < -1200) {
            this.node.destroy();
        }
    }
}
