import { _decorator, Component, Node, Label, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('EndScreen')
export class EndScreen extends Component {
    @property({ type: Node, tooltip: 'Нода с лучами для вращения' })
    sideEffects: Node = null;

    @property(Label) titleText: Label = null;
    @property(Label) subtitleText: Label = null;
    @property(Label) finalScoreText: Label = null;

    onLoad() {
        // Защита: принудительно прячем экраны при старте сцены
        this.node.active = false;
    }

    update(deltaTime: number) {
        // Бесконечно крутим лучи, если экран активен
        if (this.sideEffects && this.node.active) {
            this.sideEffects.angle -= 50 * deltaTime; 
        }
    }

    // Метод, который вызывает Player.ts
    public showScreen(isWin: boolean, score: number) {
        this.node.active = true;
        
        // Показываем заработанные доллары
        if (this.finalScoreText) {
            this.finalScoreText.string = `$${score}`;
        }

        // Подставляем нужный текст
        if (isWin) {
            if (this.titleText) this.titleText.string = "Congratulations!";
            if (this.subtitleText) this.subtitleText.string = "Choose your reward!";
        } else {
            if (this.titleText) this.titleText.string = "You didn't make it!";
            if (this.subtitleText) this.subtitleText.string = "Try again on the app!";
        }

        // Эффектное появление (выпрыгивание)
        this.node.scale = new Vec3(0, 0, 0);
        tween(this.node)
            .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
}