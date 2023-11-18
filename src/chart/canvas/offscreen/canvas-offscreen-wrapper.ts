export class CanvasOffscreenContext2D implements Partial<CanvasRenderingContext2D> {
	public commands: unknown[] = [];

	// public canvasCommands: [string, string, ...unknown[]][] = [];
	private __font: string = '12px Arial';
	private realCtx: CanvasRenderingContext2D;
	private counter = 0;

	constructor(private canvasId: string) {
		const canvas = document.createElement('canvas');
		// @ts-ignore
		this.realCtx = canvas.getContext('2d');
	}

	commit() {
		this.commands[this.counter++] = 'EOF';
	}

	resetCtx() {
		this.counter = 0;
	}

	// style = {
	// 	canvasId: this.canvasId,
	// 	canvasCommands: this.canvasCommands,
	// 	set width(val: number) {
	// 		this.canvasCommands.push([this.canvasId, 'style', 'width', val]);
	// 	},
	// 	set height(val: number) {
	// 		this.canvasCommands.push([this.canvasId, 'style', 'height', val]);
	// 	},
	// };

	set font(val: string) {
		this.__font = val;
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'font';
		this.commands[this.counter++] = val;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'font', val]);
	}

	set width(val: number) {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'width';
		this.commands[this.counter++] = val;
		this.commands[this.counter++] = 'EOC';
		// this.canvasCommands.push([this.canvasId, 'width', val]);
	}

	set height(val: number) {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'height';
		this.commands[this.counter++] = val;
		this.commands[this.counter++] = 'EOC';
		// this.canvasCommands.push([this.canvasId, 'width', val]);
	}

	set fillStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'fillStyle';
		this.commands[this.counter++] = val;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'fillStyle', val]);
	}

	set strokeStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'strokeStyle';
		this.commands[this.counter++] = val;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'strokeStyle', val]);
	}

	set lineWidth(val: number) {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'lineWidth';
		this.commands[this.counter++] = val;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'lineWidth', val]);
	}

	set lineCap(val: CanvasLineCap) {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'lineCap';
		this.commands[this.counter++] = val;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'lineCap', val]);
	}

	public save(): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'save';
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'save']);
	}

	public restore(): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'restore';
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'restore']);
	}

	public measureText(text: string): TextMetrics {
		this.realCtx.font = this.__font;
		return this.realCtx.measureText(text);
	}

	public clearRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'clearRect';
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'clearRect', x, y, w, h]);
	}

	public fillRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'fillRect';
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'fillRect', x, y, w, h]);
	}

	public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'strokeText';
		this.commands[this.counter++] = text;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		if (maxWidth !== undefined) {
			this.commands[this.counter++] = maxWidth;
		}
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'strokeText', text, x, y, maxWidth]);
	}

	public setLineDash(segments: number[]): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'setLineDash';
		this.commands[this.counter++] = segments;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'setLineDash', segments]);
	}

	public fillText(text: string, x: number, y: number, maxWidth?: number | undefined): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'fillText';
		this.commands[this.counter++] = text;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		if (maxWidth !== undefined) {
			this.commands[this.counter++] = maxWidth;
		}
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'fillText', text, x, y, maxWidth]);
	}

	public rect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'rect';
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'rect', x, y, w, h]);
	}

	public clip(fillRule?: CanvasFillRule | undefined): void;
	public clip(path: Path2D, fillRule?: CanvasFillRule | undefined): void;
	public clip(...args: unknown[]): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'clip';
		for (const arg of args) {
			this.commands[this.counter++] = arg;
		}
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'clip', ...args]);
	}

	public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'quadraticCurveTo';
		this.commands[this.counter++] = cpx;
		this.commands[this.counter++] = cpy;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'quadraticCurveTo', cpx, cpy, x, y]);
	}

	public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'bezierCurveTo';
		this.commands[this.counter++] = cp1x;
		this.commands[this.counter++] = cp1y;
		this.commands[this.counter++] = cp2x;
		this.commands[this.counter++] = cp2y;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y]);
	}

	public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
		return new ImageData(sw, sh);
	}

	public beginPath(): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'beginPath';
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'beginPath']);
	}

	public moveTo(x: number, y: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'moveTo';
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'moveTo', x, y]);
	}

	public lineTo(x: number, y: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'lineTo';
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'lineTo', x, y]);
	}

	public stroke(): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'stroke';
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'stroke']);
	}

	public fill(): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'fill';
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'fill']);
	}

	public closePath(): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'closePath';
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'closePath']);
	}

	public strokeRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'strokeRect';
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'strokeRect', x, y, w, h]);
	}

	public scale(x: number, y: number): void {
		this.commands[this.counter++] = this.canvasId;
		this.commands[this.counter++] = 'scale';
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = 'EOC';
		// this.commands.push([this.canvasId, 'scale', x, y]);
	}
}
