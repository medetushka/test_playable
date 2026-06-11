import { _decorator, Component, input, Input, EventTouch, tween, Vec3, Animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property({ type: Animation, tooltip: 'Ссылка на компонент Animation игрока' })
    playerAnim: Animation = null;

    @property({ tooltip: 'Высота прыжка в пикселях' })
    jumpHeight: number = 250;
    
    @property({ tooltip: 'Время всего прыжка (вверх и вниз) в секундах' })
    jumpDuration: number = 0.6;

    private isJumping: boolean = false;
    private isDead: boolean = false;
    private startY: number = 0;

    start() {
        // Запоминаем начальную высоту, чтобы всегда приземляться на землю
        this.startY = this.node.position.y;
        
        // Подписываемся на клик/тап по экрану
        input.on(Input.EventType.TOUCH_START, this.onJump, this);

        // Начинаем игру с анимации бега
        this.playAnim('run');
    }

    onJump(event: EventTouch) {
        // Если уже прыгаем или мертвы - игнорируем нажатие
        if (this.isJumping || this.isDead) return;
        this.isJumping = true;

        // Включаем анимацию прыжка
        this.playAnim('jump');

        // Создаем физику прыжка через Tween
        tween(this.node)
            // Взлет (с замедлением в верхней точке)
            .to(this.jumpDuration / 2, { position: new Vec3(this.node.position.x, this.startY + this.jumpHeight, 0) }, { easing: 'quadOut' })
            // Падение (с ускорением вниз)
            .to(this.jumpDuration / 2, { position: new Vec3(this.node.position.x, this.startY, 0) }, { easing: 'quadIn' })
            .call(() => { 
                this.isJumping = false; 
                
                // Как только приземлились, возвращаем анимацию бега (если не умерли в воздухе)
                if (!this.isDead) {
                    this.playAnim('run');
                }
            })
            .start();
    }

    // Этот метод мы будем вызывать извне, когда столкнемся с препятствием
    public takeDamage() {
        if (this.isDead) return;
        this.isDead = true;
        
        // Включаем анимацию получения урона
        this.playAnim('damage');
        
        // Мгновенно останавливаем прыжок, если игрок был в воздухе
        tween(this.node).stop();
    }

    // Вспомогательный метод для безопасного запуска анимаций
    private playAnim(name: string) {
        if (this.playerAnim) {
            this.playerAnim.play(name);
        }
    }

    onDestroy() {
        // Очищаем события при удалении объекта
        input.off(Input.EventType.TOUCH_START, this.onJump, this);
    }
}