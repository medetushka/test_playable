import { _decorator, Component, input, Input, EventTouch, tween, Vec3, Animation, UITransform, Node, director, Color, UIOpacity, Sprite, Label, math } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property({ type: Node, tooltip: 'Перетащи сюда ноду loot' })
    lootContainer: Node = null;

    @property({ type: Label, tooltip: 'Текст очков (Score)' })
    scoreLabel: Label = null;

    @property({ type: Label, tooltip: 'Текст комбо (Amazing, Perfect)' })
    comboLabel: Label = null;

    private currentScore: number = 0;
    private collectedItemsCount: number = 0;
    private comboWords: string[] = ["Perfect!", "Amazing!", "Fantastic!", "Awesome!"];
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

    @property({ type: Node, tooltip: 'Нода с рукой' })
    handNode: Node = null;

    @property({ type: Node, tooltip: 'Нода gamemanager (где висит Spawner)' })
    gameManagerNode: Node = null;

    @property({ type: [Node], tooltip: 'Ноды фонов (bg1 и bg2)' })
    bgNodes: Node[] = [];


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
            this.isGameStarted = true;      // Меняем флаг
            this.playAnim('run');           // Запускаем бег
            
            // Прячем стартовый UI
            if (this.tapTextNode) this.tapTextNode.active = false;
            if (this.handNode) this.handNode.active = false; 

            // ПРОГРАММНО ВКЛЮЧАЕМ СПАВНЕР
            // ПРОГРАММНО ВКЛЮЧАЕМ СПАВНЕР И ФОН ИЗ ОДНОГО МЕСТА
            if (this.gameManagerNode) {
                // Включаем спавнер
                let spawner = this.gameManagerNode.getComponent('Spawner');
                if (spawner) spawner.enabled = true;

                // Включаем движение фона
                let scroller = this.gameManagerNode.getComponent('BgScroller');
                if (scroller) scroller.enabled = true;
            }

            // (Блок с this.bgNodes.forEach можно вообще удалить, он больше не нужен)

            return; // Выходим, чтобы первый клик не вызвал прыжок
        }

        // ... дальше идет твой старый код проверки if (this.isJumping || this.isDead) return;
        // и логика самого прыжка (tween)

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
        if (!this.isGameStarted || this.isDead || !this.obstaclesContainer) return;

        let playerBox = this.node.getComponent(UITransform).getBoundingBoxToWorld();

        // 1. ПРОВЕРКА ВРАГОВ (с учетом неуязвимости)
        if (!this.isInvincible) {
            // Твой старый код сужения хитбоксов и проверки врагов
            let pShrink = 15;
            let pBoxForEnemy = playerBox.clone();
            pBoxForEnemy.x += pShrink; pBoxForEnemy.y += pShrink;
            pBoxForEnemy.width -= pShrink * 2; pBoxForEnemy.height -= pShrink * 2;

            for (let obstacle of this.obstaclesContainer.children) {
                let obsBox = obstacle.getComponent(UITransform).getBoundingBoxToWorld();
                let oShrink = 20;
                obsBox.x += oShrink; obsBox.y += oShrink;
                obsBox.width -= oShrink * 2; obsBox.height -= oShrink * 2;
                
                if (pBoxForEnemy.intersects(obsBox)) {
                    this.takeDamage();
                    break;
                }
            }
        }

        // 2. ПРОВЕРКА ДЕНЕГ (Собираем даже если мигаем красным!)
        if (this.lootContainer) {
            // Идем с конца массива, так как будем удалять элементы при сборе
            for (let i = this.lootContainer.children.length - 1; i >= 0; i--) {
                let lootNode = this.lootContainer.children[i];
                let lootBox = lootNode.getComponent(UITransform).getBoundingBoxToWorld();
                
                // Для денег хитбоксы не сужаем, чтобы собирать было легко
                if (playerBox.intersects(lootBox)) {
                    this.collectMoney(lootNode);
                }
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
    private collectMoney(lootNode: Node) {
        // 1. Уничтожаем купюру
        lootNode.destroy(); 

        // 2. Даем от 10 до 50 баксов
        let addedMoney = math.randomRangeInt(10, 51); 
        this.currentScore += addedMoney;
        if (this.scoreLabel) {
            this.scoreLabel.string = `$${this.currentScore}`;
        }

        // 3. Каждая 3-я купюра вызывает надпись
        this.collectedItemsCount++;
        if (this.collectedItemsCount % 3 === 0) {
            this.showComboText();
        }
    }

    private showComboText() {
        if (!this.comboLabel) return;
        
        let randomWord = this.comboWords[math.randomRangeInt(0, this.comboWords.length)];
        this.comboLabel.string = randomWord;
        this.comboLabel.node.active = true;
        this.comboLabel.node.scale = new Vec3(0, 0, 0); // Прячем перед анимацией

        // Анимация выпрыгивания текста
        tween(this.comboLabel.node)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
            .delay(0.5)
            .to(0.2, { scale: new Vec3(0, 0, 0) }, { easing: 'backIn' })
            .call(() => { this.comboLabel.node.active = false; })
            .start();
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onJump, this);
    }
}