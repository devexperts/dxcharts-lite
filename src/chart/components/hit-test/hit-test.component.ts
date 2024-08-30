import { distinctUntilChanged } from 'rxjs/operators';
import { CanvasAnimation } from '../../animation/canvas-animation';
import EventBus from '../../events/event-bus';
import { ChartBaseElement } from '../../model/chart-base-element';
import { HitTestCanvasModel } from '../../model/hit-test-canvas.model';

export class HitTestComponent extends ChartBaseElement {
	constructor(
		private hitTestCanvasModel: HitTestCanvasModel,
		private canvasAnimation: CanvasAnimation,
		private eventBus: EventBus,
	) {
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
		this.addRxSubscription(
			this.hitTestCanvasModel.hitTestDrawersPredicateSubject
				.pipe(distinctUntilChanged((prev, cur) => prev !== cur && prev === true && cur === false))
				.subscribe(() => this.eventBus.fireDraw([this.hitTestCanvasModel.canvasId])),
		);
	}
}
