import { _decorator, Component, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ButtonPulse')
export class ButtonPulse extends Component {
    @property({ tooltip: 'Насколько сильно увеличивается кнопка (1.1 = на 10%)' })
    scaleMultiplier: number = 1.1;

    @property({ tooltip: 'Время одного расширения (в секундах)' })
    pulseSpeed: number = 0.5;

    start() {
        // ДОБАВИЛИ .clone(), чтобы запомнить размер раз и навсегда!
        let originalScale = this.node.scale.clone(); 
        let targetScale = new Vec3(originalScale.x * this.scaleMultiplier, originalScale.y * this.scaleMultiplier, originalScale.z);

        // Чтобы анимация работала на 100% безотказно в цикле, 
        // лучше записать шаги вот в таком формате:
        tween(this.node)
            .sequence(
                tween(this.node).to(this.pulseSpeed, { scale: targetScale }, { easing: 'sineInOut' }),
                tween(this.node).to(this.pulseSpeed, { scale: originalScale }, { easing: 'sineInOut' })
            )
            .repeatForever()
            .start();

        // Если у тебя тут был слушатель клика, оставь его:
        // this.node.on(Node.EventType.TOUCH_END, this.onDownloadClick, this);
    }
}

