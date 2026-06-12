import { _decorator, Component, input, Input, EventTouch, tween, Vec3, Animation, UITransform, Node, Color, UIOpacity, Sprite, Label, math, AudioSource, AudioClip } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    // === ЗВУКИ И МУЗЫКА ===
    @property({ type: AudioSource, tooltip: 'AudioSource для ЗВУКОВ (SFX)' })
    audioSource: AudioSource = null;

    @property({ type: AudioSource, tooltip: 'AudioSource для МУЗЫКИ (BGM)' })
    bgmSource: AudioSource = null;

    @property({ type: AudioClip, tooltip: 'Звук прыжка' })
    jumpSound: AudioClip = null;

    @property({ type: AudioClip, tooltip: 'Звук урона' })
    damageSound: AudioClip = null;

    @property({ type: AudioClip, tooltip: 'Звук монетки' })
    coinSound: AudioClip = null;

    @property({ type: AudioClip, tooltip: 'Звук поражения' })
    failSound: AudioClip = null;

    @property({ type: AudioClip, tooltip: 'Звук победы' })
    winSound: AudioClip = null;

    // === ИНТЕРФЕЙС ===
    @property({ type: Node }) lootContainer: Node = null;
    @property({ type: Label }) scoreLabel: Label = null;
    @property({ type: Label }) comboLabel: Label = null;
    @property({ type: Animation }) playerAnim: Animation = null;
    @property({ type: Node }) obstaclesContainer: Node = null;
    @property({ type: Node }) tapTextNode: Node = null;
    @property({ type: [Node] }) heartsUI: Node[] = [];
    @property({ type: Node }) handNode: Node = null;
    @property({ type: Node }) gameManagerNode: Node = null;
    @property({ type: Node }) winScreenNode: Node = null;
    @property({ type: Node }) failScreenNode: Node = null;
    @property({ type: Node }) failOverlayNode: Node = null;
    @property({ type: Node }) winOverlayNode: Node = null;
    @property({ type: Node }) tutorialTextNode: Node = null;

    // === ПАРАМЕТРЫ ===
    @property jumpHeight: number = 150;
    @property jumpDuration: number = 1.0;
    @property invincibleDuration: number = 2.0;
    @property flashColor: Color = new Color(255, 0, 0, 255);

    // === ФЛАГИ ===
    private currentScore: number = 0;
    private collectedItemsCount: number = 0;
    private comboWords: string[] = ["Perfect!", "Amazing!", "Fantastic!", "Awesome!"];
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

            // ВКЛЮЧАЕМ ФОНОВУЮ МУЗЫКУ ПРИ СТАРТЕ
            if (this.bgmSource) this.bgmSource.play();

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

        // ИГРАЕМ ЗВУК ПРЫЖКА
        if (this.audioSource && this.jumpSound) {
            this.audioSource.playOneShot(this.jumpSound, 1.0);
        }

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
            let finishScript = obstacle.getComponent('FinishLine');
            if (finishScript) {
                let finishBox = obstacle.getComponent(UITransform).getBoundingBoxToWorld();
                if (playerBox.intersects(finishBox)) {
                    finishScript.playerScript = this; 
                    finishScript.triggerFinish();
                }
                continue; 
            }

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
                
                // ПРОПУСКАЕМ ТЕ КУПЮРЫ, КОТОРЫЕ УЖЕ ЛЕТЯТ К СЧЕТЧИКУ
                if (lootNode.name === "collected_loot") continue;

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

        // ИГРАЕМ ЗВУК УРОНА
        if (this.audioSource && this.damageSound) {
            this.audioSource.playOneShot(this.damageSound, 1.0);
        }

        this.lives--; 
        if (this.lives >= 0) {
            const currentHeartOpacity = this.heartsUI[this.lives].getComponent(UIOpacity);
            if (currentHeartOpacity) currentHeartOpacity.opacity = 100; 
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
            if (!this.isDead) this.playAnim('run');
        }, this.invincibleDuration);
    }

    private die() {
        this.isDead = true;

        // ВЫКЛЮЧАЕМ МУЗЫКУ И ИГРАЕМ ЗВУК ПОРАЖЕНИЯ
        if (this.bgmSource) this.bgmSource.stop();
        if (this.audioSource && this.failSound) {
            this.audioSource.playOneShot(this.failSound, 1.0);
        }

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

        if (this.failOverlayNode) this.failOverlayNode.active = true;

        this.scheduleOnce(() => {
            if (this.failOverlayNode) this.failOverlayNode.active = false;
            if (this.failScreenNode) {
                let script = this.failScreenNode.getComponent('EndScreen');
                if (script) script.showScreen(false, this.currentScore);
            }
        }, 1.5);
    }

    public win() {
        if (this.isDead) return; 
        
        this.isGameStarted = false; 
        this.playAnim('idle'); 

        // ВЫКЛЮЧАЕМ МУЗЫКУ И ИГРАЕМ ЗВУК ПОБЕДЫ
        if (this.bgmSource) this.bgmSource.stop();
        if (this.audioSource && this.winSound) {
            this.audioSource.playOneShot(this.winSound, 1.0);
        }

        if (this.gameManagerNode) {
            let spawner = this.gameManagerNode.getComponent('Spawner');
            if (spawner) spawner.enabled = false;
            let scroller = this.gameManagerNode.getComponent('BgScroller');
            if (scroller) scroller.enabled = false;
        }

        this.toggleExistingObjects(false);

        if (this.winOverlayNode) this.winOverlayNode.active = true;

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
        if (this.playerAnim) this.playerAnim.play(name);
    }

    // НОВЫЙ КРУТОЙ МЕТОД СОБИРАНИЯ ДЕНЕГ
    private collectMoney(lootNode: Node) {
        // 1. Защита от повторного сбора
        lootNode.name = "collected_loot"; 

        // 2. Отключаем движение купюры (чтобы она не уехала за экран пока летит)
        let obsScript = lootNode.getComponent('Obstacle');
        if (obsScript) obsScript.enabled = false;

        // 3. Вычисляем точку полета (в центр счетчика очков)
        let targetPos = new Vec3(0, 0, 0);
        if (this.scoreLabel) {
            targetPos = this.scoreLabel.node.worldPosition;
        }

        // 4. Запускаем полет с уменьшением масштаба до нуля
        tween(lootNode)
            .to(0.4, { worldPosition: targetPos, scale: new Vec3(0, 0, 0) }, { easing: 'backIn' })
            .call(() => {
                // Как только долетели - удаляем
                lootNode.destroy(); 
                
                // Даем деньги
                let addedMoney = math.randomRangeInt(10, 51); 
                this.currentScore += addedMoney;
                
                if (this.scoreLabel) {
                    this.scoreLabel.string = `$${this.currentScore}`;
                    
                    // ТРЯСКА СЧЕТЧИКА (Увеличиваем до 130% и обратно)
                    tween(this.scoreLabel.node)
                        .to(0.1, { scale: new Vec3(1.3, 1.3, 1) })
                        .to(0.1, { scale: new Vec3(1.0, 1.0, 1) })
                        .start();
                }

                // Звук монетки при достижении счетчика
                if (this.audioSource && this.coinSound) {
                    this.audioSource.playOneShot(this.coinSound, 0.8);
                }

                // Комбо-надписи
                if (!this.isComboCooldown) {
                    this.collectedItemsCount++;
                    if (this.collectedItemsCount % 3 === 0) {
                        this.showComboText();
                    }
                }
            })
            .start();
    }

    private showComboText() {
        if (!this.comboLabel) return;
        this.isComboCooldown = true;

        let randomWord = this.comboWords[math.randomRangeInt(0, this.comboWords.length)];
        this.comboLabel.string = randomWord;
        this.comboLabel.node.active = true;

        let opacityComp = this.comboLabel.getComponent(UIOpacity);
        if (!opacityComp) opacityComp = this.comboLabel.addComponent(UIOpacity);

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
            .call(() => { this.comboLabel.node.active = false; })
            .start();

        this.scheduleOnce(() => { this.isComboCooldown = false; }, 1.0); 
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onJump, this);
    }
}