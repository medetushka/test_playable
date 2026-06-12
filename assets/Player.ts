import { _decorator, Component, input, Input, EventTouch, tween, Vec3, Animation, UITransform, Node, director, Color, UIOpacity, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property({ type: Animation, tooltip: 'Ссылка на компонент Animation игрока' })
    playerAnim: Animation = null;

    @property({ type: Node, tooltip: 'Перетащи сюда ноду obstacles' })
    obstaclesContainer: Node = null;

    @property({ type: Node, tooltip: 'Перетащи сюда текст Tap to start' })
    tapTextNode: Node = null;

    // ОБНОВИЛИ: Ссылка на ноды сердечек (с компонентом UIOpacity)
    @property({ type: [Node], tooltip: 'Перетащи сюда 3 ноды сердечек (от 3-го к 1-му)' })
    heartsUI: Node[] = [];

    @property
    jumpHeight: number = 150;
    
    @property
    jumpDuration: number = 1.0;

    // --- НОВЫЕ ПАРАМЕТРЫ ДЛЯ НЕУЯЗВИМОСТИ ---
    @property({ tooltip: 'Продолжительность неуязвимости (в сек)' })
    invincibleDuration: number = 2.0;

    @property({ tooltip: 'Цвет мелькания при уроне' })
    flashColor: Color = new Color(255, 0, 0, 255); // Чистый красный

    private isJumping: boolean = false;
    private isDead: boolean = false;
    private startY: number = 0;
    public isGameStarted: boolean = false;

    // --- ФЛАГИ ДЛЯ НОВОЙ ЛОГИКИ ---
    private lives: number = 3;
    private isInvincible: boolean = false; // Флаг текущей неуязвимости
    private spriteComponent: Sprite = null; // Ссылка на спрайт для смены цвета

    start() {
        this.startY = this.node.position.y;
        this.spriteComponent = this.getComponent(Sprite); // Кэшируем спрайт
        
        input.on(Input.EventType.TOUCH_START, this.onJump, this);
        this.playAnim('idle'); 
    }

    onJump(event: EventTouch) {
        if (!this.isGameStarted) {
            this.isGameStarted = true;
            this.playAnim('run');
            
            if (this.tapTextNode) this.tapTextNode.active = false;
            return;
        }

        if (this.isJumping || this.isDead) return;
        this.isJumping = true;
        this.playAnim('jump');

        tween(this.node)
            .to(this.jumpDuration / 2, { position: new Vec3(this.node.position.x, this.startY + this.jumpHeight, 0) }, { easing: 'quadOut' })
            .to(this.jumpDuration / 2, { position: new Vec3(this.node.position.x, this.startY, 0) }, { easing: 'quadIn' })
            .call(() => { 
                this.isJumping = false; 
                // ВОЗВРАЩАЕМ БЕГ ПОСЛЕ ПРИЗЕМЛЕНИЯ (проверяем, не мертвы ли мы и не мигаем ли)
                if (!this.isDead && !this.isInvincible) {
                    this.playAnim('run');
                }
            })
            .start();
    }

    update(deltaTime: number) {
        // ОБНОВИЛИ ЛОГИКУ КОЛЛИЗИЙ:
        // Если игра не началась, мы мертвы или НЕУЯЗВИМЫ — коллизии не проверяем!
        if (!this.isGameStarted || this.isDead || this.isInvincible || !this.obstaclesContainer) return;

        let playerBox = this.node.getComponent(UITransform).getBoundingBoxToWorld();

        for (let obstacle of this.obstaclesContainer.children) {
            let obsBox = obstacle.getComponent(UITransform).getBoundingBoxToWorld();
            
            if (playerBox.intersects(obsBox)) {
                // Мы больше не уничтожаем врага и не передаем его ноду!
                this.takeDamage(); 
                break; 
            }
        }
    }

    // ПОЛНОСТЬЮ ОБНОВЛЕННЫЙ МЕТОД TAKE DAMAGE
    public takeDamage() {
        // Защита от повторного вызова (C++ style safety)
        if (this.isInvincible || this.isDead) return;
        this.isInvincible = true; // Включаем неуязвимость!

        // 1. УРОН И СЕРДЦА (Прозрачность)
        this.lives--; 
        if (this.lives >= 0) {
            // Ищем компонент UIOpacity у сердечка и делаем его полупрозрачным
            const currentHeartOpacity = this.heartsUI[this.lives].getComponent(UIOpacity);
            if (currentHeartOpacity) {
                // target 100 из 255 — оно станет прозрачным, но контур останется виден
                currentHeartOpacity.opacity = 100; 
            }
        }

        // 2. СМЕРТЬ (Lives == 0)
        if (this.lives <= 0) {
            this.die();
            return;
        }

        // 3. НЕУЯЗВИМОСТЬ (Жизни еще есть)
        
        // Мгновенно роняем на землю, если были в воздухе, и останавливаем прыжок
        tween(this.node).stop();
        this.node.setPosition(this.node.position.x, this.startY, 0);
        this.isJumping = false;

        // Включаем анимацию получения урона (она проиграет normal и застынет)
        this.playAnim('damage');

        // ЗАПУСКАЕМ ЭФФЕКТ МИГАНИЯ
        this.startFlashingEffect();

        // ЧЕРЕЗ 2 СЕКУНДЫ ВЫКЛЮЧАЕМ НЕУЯЗВИМОСТЬ
        this.scheduleOnce(() => {
            this.isInvincible = false;
            
            // Если мы не умерли от следующего удара, возвращаем бег
            if (!this.isDead) {
                this.playAnim('run');
            }
        }, this.invincibleDuration);
    }

    private die() {
        this.isDead = true;
        
        // Гасим все сердца (UIOpacity = 0)
        this.heartsUI.forEach(heartNode => {
            const opacity = heartNode.getComponent(UIOpacity);
            if (opacity) opacity.opacity = 0;
        });

        // Включаем анимацию урона и перезагружаем сцену через 2сек
        this.playAnim('damage');
        tween(this.node).stop();
        this.node.setPosition(this.node.position.x, this.startY, 0);

        this.scheduleOnce(() => {
            let currentSceneName = director.getScene().name;
            director.loadScene(currentSceneName);
        }, 2.0);
    }

    // НОВЫЙ ВСПОМОГАТЕЛЬНЫЙ МЕТОД: Мелькание красным
    private startFlashingEffect() {
        if (!this.spriteComponent) return;

        // Определяем белый цвет (возврат к норме)
        const whiteColor = new Color(255, 255, 255, 255);

        // Расчитываем время мигания: мы должны мигать часто в течение duration.
        // Пусть будет 10 мельканий за 2 секунды = каждые 0.2 сек.
        const flashSpeed = this.invincibleDuration / 10;

        // Создаем сложный Tween-цикл: красный -> белый.
        tween(this.spriteComponent)
            // Фаза 1: Окрашиваем в красный
            .to(flashSpeed / 2, { color: this.flashColor }, { easing: 'sineOut' })
            // Фаза 2: Возвращаем белый
            .to(flashSpeed / 2, { color: whiteColor }, { easing: 'sineIn' })
            .union() // Объединяем эти два шага в один "цикл мигания"
            .repeat(10) // Повторяем цикл 10 раз (чтобы занять duration)
            .call(() => {
                // На всякий случай: гарантируем, что по окончании мигания игрок стал белым
                if (this.spriteComponent) this.spriteComponent.color = whiteColor;
            })
            .start();
    }

    private playAnim(name: string) {
        if (this.playerAnim) {
            this.playerAnim.play(name);
        }
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onJump, this);
    }
}