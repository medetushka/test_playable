import { _decorator, Component, input, Input, EventTouch, tween, Vec3, Animation, UITransform, Node, Color, UIOpacity, Sprite, Label, math } from 'cc';
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

    @property({ type: [Node], tooltip: 'Перетащи сюда 3 ноды сердечек (от 3-го к 1-му)' })
    heartsUI: Node[] = [];

    @property
    jumpHeight: number = 150;
    
    @property
    jumpDuration: number = 1.0;

    @property({ tooltip: 'Продолжительность неуязвимости (в сек)' })
    invincibleDuration: number = 2.0;

    @property({ tooltip: 'Цвет мелькания при уроне' })
    flashColor: Color = new Color(255, 0, 0, 255);

    @property({ type: Node, tooltip: 'Нода с рукой' })
    handNode: Node = null;

    @property({ type: Node, tooltip: 'Нода gamemanager (где висит Spawner)' })
    gameManagerNode: Node = null;

    @property({ type: Node, tooltip: 'Нода WinScreen' })
    winScreenNode: Node = null;

    @property({ type: Node, tooltip: 'Нода FailScreen' })
    failScreenNode: Node = null;

    @property({ type: Node, tooltip: 'Нода с затемнением и иконкой FAIL' })
    failOverlayNode: Node = null;

    // НОВОЕ: Затемнение для экрана победы
    @property({ type: Node, tooltip: 'Нода с затемнением для ПОБЕДЫ' })
    winOverlayNode: Node = null;

    @property({ type: Node, tooltip: 'Текст Click to Jump' })
    tutorialTextNode: Node = null;

    // --- ФЛАГИ ТУТОРИАЛА И ИГРЫ ---
    private isTutorialDone: boolean = false;
    private isTutorialPaused: boolean = false;

    private isJumping: boolean = false;
    private isDead: boolean = false;
    private startY: number = 0;
    public isGameStarted: boolean = false;

    private isComboCooldown: boolean = false; 
    private lives: number = 3;
    private isInvincible: boolean = false; 
    private spriteComponent: Sprite = null; 

    start() {
        this.startY = this.node.position.y;
        this.spriteComponent = this.getComponent(Sprite); 
        
        input.on(Input.EventType.TOUCH_START, this.onJump, this);
        this.playAnim('idle'); 
    }

    onJump(event: EventTouch) {
        if (!this.isGameStarted) {
            this.isGameStarted = true;      
            this.playAnim('run');           
            
            if (this.tapTextNode) this.tapTextNode.active = false;
            if (this.handNode) this.handNode.active = false; 

            if (this.gameManagerNode) {
                let spawner = this.gameManagerNode.getComponent('Spawner');
                if (spawner) spawner.enabled = true;

                let scroller = this.gameManagerNode.getComponent('BgScroller');
                if (scroller) scroller.enabled = true;
            }
            return; 
        }

        if (this.isTutorialPaused) {
            this.finishTutorial();
            this.performJump();
            return;
        }

        if (!this.isTutorialDone) {
            return; 
        }

        if (!this.isJumping && !this.isDead) {
            this.performJump();
        }
    }

    private performJump() {
        this.isJumping = true;
        this.playAnim('jump');

        tween(this.node)
            .to(this.jumpDuration / 2, { position: new Vec3(this.node.position.x, this.startY + this.jumpHeight, 0) }, { easing: 'quadOut' })
            .to(this.jumpDuration / 2, { position: new Vec3(this.node.position.x, this.startY, 0) }, { easing: 'quadIn' })
            .call(() => { 
                this.isJumping = false; 
                if (!this.isDead && !this.isInvincible) {
                    this.playAnim('run');
                }
            })
            .start();
    }

    private toggleExistingObjects(isMoving: boolean) {
        if (this.obstaclesContainer) {
            this.obstaclesContainer.children.forEach(obs => {
                let script = obs.getComponent('Obstacle'); 
                if (script) script.enabled = isMoving;
            });
        }

        if (this.lootContainer) {
            this.lootContainer.children.forEach(loot => {
                let script = loot.getComponent('Obstacle'); 
                if (script) script.enabled = isMoving;
            });
        }
    }

    private finishTutorial() {
        this.isTutorialPaused = false;
        this.isTutorialDone = true; 

        if (this.tutorialTextNode) this.tutorialTextNode.active = false;

        if (this.gameManagerNode) {
            let spawner = this.gameManagerNode.getComponent('Spawner');
            if (spawner) spawner.enabled = true;

            let scroller = this.gameManagerNode.getComponent('BgScroller');
            if (scroller) scroller.enabled = true;
        }

        this.toggleExistingObjects(true);
    }

    update(deltaTime: number) {
        if (!this.isGameStarted || this.isDead || !this.obstaclesContainer) return;

        let playerBox = this.node.getComponent(UITransform).getBoundingBoxToWorld();
        
        // --- ЛОГИКА ТУТОРИАЛА ---
        if (!this.isTutorialDone && !this.isTutorialPaused && this.obstaclesContainer.children.length > 0) {
            let firstObstacle = this.obstaclesContainer.children[0];
            let distance = firstObstacle.worldPosition.x - this.node.worldPosition.x;
            
            if (distance > 0 && distance < 120) {
                this.isTutorialPaused = true;
                this.playAnim('idle'); 
                
                if (this.gameManagerNode) {
                    let spawner = this.gameManagerNode.getComponent('Spawner');
                    if (spawner) spawner.enabled = false;
                    let scroller = this.gameManagerNode.getComponent('BgScroller');
                    if (scroller) scroller.enabled = false;
                }
                
                this.toggleExistingObjects(false);
                if (this.tutorialTextNode) this.tutorialTextNode.active = true;
            }
        }

        if (this.isTutorialPaused) return;

        // 1. ПРОВЕРКА ВРАГОВ И ФИНИША
        let pShrink = 15;
        let pBoxForEnemy = playerBox.clone();
        pBoxForEnemy.x += pShrink; pBoxForEnemy.y += pShrink;
        pBoxForEnemy.width -= pShrink * 2; pBoxForEnemy.height -= pShrink * 2;

        for (let obstacle of this.obstaclesContainer.children) {
            
            // А. ПРОВЕРКА НА ФИНИШ
            let finishScript = obstacle.getComponent('FinishLine');
            if (finishScript) {
                let finishBox = obstacle.getComponent(UITransform).getBoundingBoxToWorld();
                
                if (playerBox.intersects(finishBox)) {
                    finishScript.playerScript = this; 
                    finishScript.triggerFinish();
                }
                continue; // Пропускаем проверку урона для финиша!
            }

            // Б. ПРОВЕРКА НА УРОН (Обычные враги)
            if (!this.isInvincible) {
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

        // 2. ПРОВЕРКА ДЕНЕГ
        if (this.lootContainer) {
            for (let i = this.lootContainer.children.length - 1; i >= 0; i--) {
                let lootNode = this.lootContainer.children[i];
                let lootBox = lootNode.getComponent(UITransform).getBoundingBoxToWorld();
                
                if (playerBox.intersects(lootBox)) {
                    this.collectMoney(lootNode);
                }
            }
        }
    }

    public takeDamage() {
        if (this.isInvincible || this.isDead) return;
        this.isInvincible = true; 

        this.lives--; 
        if (this.lives >= 0) {
            const currentHeartOpacity = this.heartsUI[this.lives].getComponent(UIOpacity);
            if (currentHeartOpacity) {
                currentHeartOpacity.opacity = 100; 
            }
        }

        if (this.lives <= 0) {
            this.die();
            return;
        }

        tween(this.node).stop();
        this.node.setPosition(this.node.position.x, this.startY, 0);
        this.isJumping = false;

        this.playAnim('damage');
        this.startFlashingEffect();

        this.scheduleOnce(() => {
            this.isInvincible = false;
            if (!this.isDead) {
                this.playAnim('run');
            }
        }, this.invincibleDuration);
    }

    private die() {
        this.isDead = true;

        this.heartsUI.forEach(heart => {
            const op = heart.getComponent(UIOpacity);
            if (op) op.opacity = 0;
        });
        this.playAnim('damage');
        tween(this.node).stop();
        this.node.setPosition(this.node.position.x, this.startY, 0);

        if (this.gameManagerNode) {
            let spawner = this.gameManagerNode.getComponent('Spawner');
            if (spawner) spawner.enabled = false;
            let scroller = this.gameManagerNode.getComponent('BgScroller');
            if (scroller) scroller.enabled = false;
        }

        if (this.failOverlayNode) {
            this.failOverlayNode.active = true;
        }

        this.scheduleOnce(() => {
            if (this.failOverlayNode) this.failOverlayNode.active = false;
            if (this.failScreenNode) {
                let script = this.failScreenNode.getComponent('EndScreen');
                if (script) script.showScreen(false, this.currentScore);
            }
        }, 1.5);
    }

    // ПОЛНОСТЬЮ ОБНОВЛЕННЫЙ МЕТОД ПОБЕДЫ
    public win() {
        if (this.isDead) return; 
        
        // 1. МГНОВЕННАЯ ОСТАНОВКА
        this.isGameStarted = false; 
        this.playAnim('idle'); 

        // Останавливаем движение мира
        if (this.gameManagerNode) {
            let spawner = this.gameManagerNode.getComponent('Spawner');
            if (spawner) spawner.enabled = false;
            let scroller = this.gameManagerNode.getComponent('BgScroller');
            if (scroller) scroller.enabled = false;
        }

        // Останавливаем все препятствия и деньги, которые уже ехали
        this.toggleExistingObjects(false);

        // 2. ВКЛЮЧАЕМ ЗАТЕМНЕНИЕ СРАЗУ ЖЕ
        if (this.winOverlayNode) {
            this.winOverlayNode.active = true;
        }

        // 3. ЗАДЕРЖКА ДЛЯ КАРТОЧКИ (чтобы конфетти успели бахнуть)
        this.scheduleOnce(() => {
            if (this.winScreenNode) {
                let script = this.winScreenNode.getComponent('EndScreen');
                if (script) script.showScreen(true, this.currentScore); 
            }
        }, 1.5); 
    }

    private startFlashingEffect() {
        if (!this.spriteComponent) return;
        const whiteColor = new Color(255, 255, 255, 255);
        const flashSpeed = this.invincibleDuration / 10;

        tween(this.spriteComponent)
            .to(flashSpeed / 2, { color: this.flashColor }, { easing: 'sineOut' })
            .to(flashSpeed / 2, { color: whiteColor }, { easing: 'sineIn' })
            .union() 
            .repeat(10) 
            .call(() => {
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
        lootNode.destroy(); 
        let addedMoney = math.randomRangeInt(10, 51); 
        this.currentScore += addedMoney;
        if (this.scoreLabel) {
            this.scoreLabel.string = `$${this.currentScore}`;
        }

        if (!this.isComboCooldown) {
            this.collectedItemsCount++;
            if (this.collectedItemsCount % 3 === 0) {
                this.showComboText();
            }
        }
    }

    private showComboText() {
        if (!this.comboLabel) return;
        this.isComboCooldown = true;

        let randomWord = this.comboWords[math.randomRangeInt(0, this.comboWords.length)];
        this.comboLabel.string = randomWord;
        this.comboLabel.node.active = true;

        let opacityComp = this.comboLabel.getComponent(UIOpacity);
        if (!opacityComp) {
            opacityComp = this.comboLabel.addComponent(UIOpacity);
        }

        opacityComp.opacity = 255; 
        this.comboLabel.node.scale = new Vec3(0, 0, 0); 
        this.comboLabel.node.angle = 0; 

        tween(this.comboLabel.node)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' }) 
            .to(0.05, { angle: 10 })
            .to(0.05, { angle: -10 })
            .to(0.05, { angle: 5 })
            .to(0.05, { angle: -5 })
            .to(0.05, { angle: 0 }) 
            .start();

        tween(opacityComp)
            .delay(0.6) 
            .to(0.8, { opacity: 0 }) 
            .call(() => { 
                this.comboLabel.node.active = false; 
            })
            .start();

        this.scheduleOnce(() => {
            this.isComboCooldown = false;
        }, 1.0); 
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onJump, this);
    }
}