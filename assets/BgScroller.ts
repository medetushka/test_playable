import { _decorator, Component, Node, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BgScroller')
export class BgScroller extends Component {
    @property(Node) 
    bg1: Node = null;
    
    @property(Node) 
    bg2: Node = null;
    
    @property 
    speed: number = 300; 

    private bgWidth: number = 0;

    // ИЗМЕНЕНО: теперь это onLoad, он срабатывает до старта игры
    onLoad() {
        if (!this.bg1 || !this.bg2) return;

        // Получаем ширину первого фона
        this.bgWidth = this.bg1.getComponent(UITransform).width;

        // Склеиваем фоны еще до того, как они покажутся на экране
        this.bg2.setPosition(this.bg1.position.x + this.bgWidth, this.bg2.position.y);
    }

    update(deltaTime: number) {
        let dx = this.speed * deltaTime;
        
        this.bg1.setPosition(this.bg1.position.x - dx, this.bg1.position.y);
        this.bg2.setPosition(this.bg2.position.x - dx, this.bg2.position.y);
        
        if (this.bg1.position.x <= -this.bgWidth) {
            this.bg1.setPosition(this.bg2.position.x + this.bgWidth, this.bg1.position.y);
        }
        
        if (this.bg2.position.x <= -this.bgWidth) {
            this.bg2.setPosition(this.bg1.position.x + this.bgWidth, this.bg2.position.y);
        }
    }
}