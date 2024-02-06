import { CanvasAnimation } from '../../animation/canvas-animation';
import { ChartBaseElement } from '../../model/chart-base-element';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';

export class HitTestComponent extends ChartBaseElement {
	constructor(private hitTestCanvasModel: HitTestCanvasModel, private canvasAnimation: CanvasAnimation) {
		super();
	}

	protected doActivate(): void {
		super.doActivate();
		this.addRxSubscription(
			this.canvasAnimation.animationInProgressSubject.subscribe(() => {
				const animationInProgress = this.canvasAnimation.animationInProgressSubject.getValue();
				this.hitTestCanvasModel.hitTestDrawersPredicateSubject.next(!animationInProgress);
			}),
		);
	}
}
