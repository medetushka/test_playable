import { _decorator, Component, Node, view, Vec3, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ResponsiveFooter')
export class ResponsiveFooter extends Component {
    @property({ type: Node, tooltip: 'Нода left (Обертка логотипа)' })
    leftWrapper: Node = null;

    @property({ type: Node, tooltip: 'Нода right (Обертка кнопки)' })
    rightWrapper: Node = null;

    @property({ tooltip: 'Желаемый масштаб в ВЕРТИКАЛЬНОМ режиме' })
    portraitScale: number = 0.4; 

    @property({ tooltip: 'Желаемый масштаб в ГОРИЗОНТАЛЬНОМ режиме' })
    landscapeScale: number = 0.5;

    update() {
        const screenSize = view.getVisibleSize();
        const isPortrait = screenSize.height > screenSize.width;

        // 1. Берем базовый масштаб
        let targetScale = isPortrait ? this.portraitScale : this.landscapeScale;

        // 2. Получаем реальную ширину картинок
        let leftWidth = 0;
        let rightWidth = 0;
        if (this.leftWrapper) {
            let ui = this.leftWrapper.getComponent(UITransform);
            if (ui) leftWidth = ui.width;
        }
        if (this.rightWrapper) {
            let ui = this.rightWrapper.getComponent(UITransform);
            if (ui) rightWidth = ui.width;
        }

        let edgeOffset = 20; // Отступ от краев экрана
        let minGap = 15;     // Минимальный зазор между лого и кнопкой по центру
        let availableWidth = screenSize.width - (edgeOffset * 2) - minGap;

        // 3. АВТО-ПРЕДОХРАНИТЕЛЬ (Магия)
        // Если элементы шире, чем экран — насильно уменьшаем их пропорционально!
        let totalWidthScaled = (leftWidth + rightWidth) * targetScale;
        if (totalWidthScaled > availableWidth && availableWidth > 0) {
            targetScale = targetScale * (availableWidth / totalWidthScaled);
        }

        let scaleVec = new Vec3(targetScale, targetScale, 1);
        let halfWidth = screenSize.width / 2;

        // 4. Расставляем по краям с учетом финального безопасного масштаба
        if (this.leftWrapper) {
            this.leftWrapper.scale = scaleVec;
            let actualWidth = leftWidth * targetScale;
            this.leftWrapper.setPosition(-halfWidth + (actualWidth / 2) + edgeOffset, 0, 0);
        }

        if (this.rightWrapper) {
            this.rightWrapper.scale = scaleVec;
            let actualWidth = rightWidth * targetScale;
            this.rightWrapper.setPosition(halfWidth - (actualWidth / 2) - edgeOffset, 0, 0);
        }
    }
}