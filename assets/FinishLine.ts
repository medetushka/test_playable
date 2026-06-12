import { _decorator, Component, Node, tween, Vec3, Prefab, instantiate, UIOpacity, math, find } from 'cc';
import { Player } from './Player'; 
const { ccclass, property } = _decorator;

@ccclass('FinishLine')
export class FinishLine extends Component {
    @property({ type: Node, tooltip: 'Левая половина ленты' }) 
    leftRibbon: Node = null;
    
    @property({ type: Node, tooltip: 'Правая половина ленты' }) 
    rightRibbon: Node = null;

    @property({ type: [Prefab], tooltip: 'Префабы разных конфетти' })
    confettiPrefabs: Prefab[] = [];

    // Ссылку на игрока мы передаем динамически при касании
    public playerScript: Player = null;
    private isTriggered: boolean = false;

    public triggerFinish() {
        if (this.isTriggered) return;
        this.isTriggered = true;

        // 1. МГНОВЕННО останавливаем игру (вызываем win у игрока)
        if (this.playerScript) {
            this.playerScript.win();
        }

        // 2. Края ленты эффектно отлетают в стороны
        if (this.leftRibbon) {
            tween(this.leftRibbon)
                .by(0.5, { position: new Vec3(-100, -50, 0), angle: 45 }, { easing: 'quadOut' })
                .start();
        }
        if (this.rightRibbon) {
            tween(this.rightRibbon)
                .by(0.5, { position: new Vec3(100, -50, 0), angle: -45 }, { easing: 'quadOut' })
                .start();
        }

        // 3. Эпичный взрыв конфетти из центра экрана
        this.spawnConfetti();
    }

    private spawnConfetti() {
        if (this.confettiPrefabs.length === 0) return;

        // Ищем главный Canvas, чтобы конфетти спавнились ровно по центру экрана
        let canvas = find('Canvas');
        if (!canvas) canvas = this.node; // Резервный вариант, если Canvas не найден

        // 150 штук для огромного облака!
        for (let i = 0; i < 150; i++) {
            let randomPrefab = this.confettiPrefabs[math.randomRangeInt(0, this.confettiPrefabs.length)];
            let confetti = instantiate(randomPrefab);
            
            // Прикрепляем к Canvas
            canvas.addChild(confetti);
            
            // Ставим в самый центр экрана (0, 0)
            confetti.setPosition(0, 0, 0); 
            
            // Рандомный размер
            let randomScale = math.randomRange(0.5, 1.2);
            confetti.setScale(new Vec3(randomScale, randomScale, 1));

            // ФИЗИКА ПОЛЕТА:
            let targetX = math.randomRange(-600, 600); // Разброс по ширине экрана
            let peakY = math.randomRange(200, 500);    // Высота подброса (вверх от центра)
            let endY = -800;                           // Точка падения (далеко вниз за экран)

            let durationUp = math.randomRange(0.4, 0.7);   // Резкий выстрел вверх
            let durationDown = math.randomRange(1.5, 2.5); // Плавное падение
            let targetAngle = math.randomRange(-1000, 1000); // Сильное вращение

            let opacityComp = confetti.addComponent(UIOpacity);

            tween(confetti)
                .parallel(
                    // Вращение
                    tween().to(durationUp + durationDown, { angle: targetAngle }),
                    // Траектория (Вверх, затем Вниз)
                    tween()
                        .to(durationUp, { position: new Vec3(targetX / 2, peakY, 0) }, { easing: 'cubicOut' })
                        .to(durationDown, { position: new Vec3(targetX, endY, 0) }, { easing: 'sineIn' })
                )
                .call(() => {
                    confetti.destroy(); // Удаляем, когда упали за экран
                })
                .start();
        }
    }
}