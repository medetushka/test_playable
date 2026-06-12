import { _decorator, Component, Node, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('StoreLink')
export class StoreLink extends Component {
    @property({ tooltip: 'Ссылка на твою игру в Google Play' })
    googlePlayUrl: string = "https://play.google.com/store/apps/details?id=com.fgol.HungrySharkEvolution&pcampaignid=web_share";

    start() {
        // Автоматически делаем этот объект кликабельным
        this.node.on(Node.EventType.TOUCH_END, this.openStore, this);
    }

    openStore() {
        console.log("Переход в Google Play...");
        sys.openURL(this.googlePlayUrl);
    }
}