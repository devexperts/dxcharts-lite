export class CanvasOffscreenContext2D implements Partial<CanvasRenderingContext2D> {
	public commands: [string, string, ...unknown[]][] = [];

	constructor(private canvasId: string) {}

	set fillStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands.push([this.canvasId, 'fillStyle', val]);
	}

	set strokeStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands.push([this.canvasId, 'strokeStyle', val]);
	}

	set lineWidth(val: number) {
		this.commands.push([this.canvasId, 'lineWidth', val]);
	}

	set lineCap(val: CanvasLineCap) {
		this.commands.push([this.canvasId, 'lineCap', val]);
	}

	public save(): void {
		this.commands.push([this.canvasId, 'save']);
	}

	public restore(): void {
		this.commands.push([this.canvasId, 'restore']);
	}

	public measureText(): TextMetrics {
		return {
			actualBoundingBoxAscent: 0,
			actualBoundingBoxDescent: 0,
			actualBoundingBoxLeft: 0,
			actualBoundingBoxRight: 0,
			fontBoundingBoxAscent: 0,
			fontBoundingBoxDescent: 0,
			width: 0,
		};
	}

	public clearRect(x: number, y: number, w: number, h: number): void {
		this.commands.push([this.canvasId, 'clearRect', x, y, w, h]);
	}

	public fillRect(x: number, y: number, w: number, h: number): void {
		this.commands.push([this.canvasId, 'fillRect', x, y, w, h]);
	}

	public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
		this.commands.push([this.canvasId, 'strokeText', text, x, y, maxWidth]);
	}

	public setLineDash(segments: number[]): void {
		this.commands.push([this.canvasId, 'setLineDash', segments]);
	}

	public fillText(text: string, x: number, y: number, maxWidth?: number | undefined): void {
		this.commands.push([this.canvasId, 'fillText', text, x, y, maxWidth]);
	}

	public rect(x: number, y: number, w: number, h: number): void {
		this.commands.push([this.canvasId, 'rect', x, y, w, h]);
	}

	public clip(fillRule?: CanvasFillRule | undefined): void;
	public clip(path: Path2D, fillRule?: CanvasFillRule | undefined): void;
	public clip(...args: unknown[]): void {
		this.commands.push([this.canvasId, 'clip', ...args]);
	}

	public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		this.commands.push([this.canvasId, 'quadraticCurveTo', cpx, cpy, x, y]);
	}

	public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
		this.commands.push([this.canvasId, 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y]);
	}

	public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
		return new ImageData(sw, sh);
	}

	public beginPath(): void {
		this.commands.push([this.canvasId, 'beginPath']);
	}

	public moveTo(x: number, y: number): void {
		this.commands.push([this.canvasId, 'moveTo', x, y]);
	}

	public lineTo(x: number, y: number): void {
		this.commands.push([this.canvasId, 'lineTo', x, y]);
	}

	public stroke(): void {
		this.commands.push([this.canvasId, 'stroke']);
	}

	public fill(): void {
		this.commands.push([this.canvasId, 'fill']);
	}

	public closePath(): void {
		this.commands.push([this.canvasId, 'closePath']);
	}

	public strokeRect(x: number, y: number, w: number, h: number): void {
		this.commands.push([this.canvasId, 'strokeRect', x, y, w, h]);
	}

	public scale(x: number, y: number): void {
		this.commands.push([this.canvasId, 'scale', x, y]);
	}
}
