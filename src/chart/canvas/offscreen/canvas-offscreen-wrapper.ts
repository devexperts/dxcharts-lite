import {
	BEGIN_PATH,
	BEZIER_CURVE_TO,
	CLEAR_RECT,
	CLIP,
	CLOSE_PATH,
	FILL,
	FILL_RECT,
	FILL_STYLE,
	FILL_TEXT,
	FONT,
	HEIGHT,
	LINE_CAP,
	LINE_TO,
	LINE_WIDTH,
	MOVE_TO,
	QUADRATIC_CURVE_TO,
	RECT,
	RESTORE,
	SAVE,
	SCALE,
	STROKE,
	STROKE_RECT,
	STROKE_STYLE,
	STROKE_TEXT,
	WIDTH
} from './canvas-ctx.mapper';

const END_OF_FILE = 0xdead;
const canvas = document.createElement('canvas');
// @ts-ignore
const ctxForMeasure: CanvasRenderingContext2D = canvas.getContext('2d');

let poolCounter = Number.MIN_SAFE_INTEGER;
const stringsPool = new Map<string, number>();
export const strSync: unknown[] = [];

export class CanvasOffscreenContext2D implements Partial<CanvasRenderingContext2D> {
	public commands: Float64Array;
	public buffer: unknown;

	private getStringId(str: string): number {
		let id = stringsPool.get(str);
		if (id === undefined) {
			id = poolCounter++;
			strSync.push(str, id);
			stringsPool.set(str, id);
		}
		return id;
	}

	private __font: string = '12px Arial';
	private counter = 0;

	constructor(public idx: number) {
		this.buffer = new SharedArrayBuffer(8 * 50000);
		// @ts-ignore
		this.commands = new Float64Array(this.buffer);
		this.commands[this.counter++] = this.idx;
	}

	commit() {
		this.commands[this.counter] = END_OF_FILE;
		this.counter = 0;
		this.commands[this.counter++] = this.idx;
	}

	set font(val: string) {
		this.__font = val;
		this.commands[this.counter++] = FONT;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStringId(val);
	}

	set width(val: number) {
		this.commands[this.counter++] = WIDTH;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = val;
	}

	set height(val: number) {
		this.commands[this.counter++] = HEIGHT;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = val;
	}

	set fillStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands[this.counter++] = FILL_STYLE;
		this.commands[this.counter++] = -1;
		// @ts-ignore
		this.commands[this.counter++] = this.getStringId(val);
	}

	set strokeStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands[this.counter++] = STROKE_STYLE;
		this.commands[this.counter++] = -1;
		// @ts-ignore
		this.commands[this.counter++] = this.getStringId(val);
	}

	set lineWidth(val: number) {
		this.commands[this.counter++] = LINE_WIDTH;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = val;
	}

	set lineCap(val: CanvasLineCap) {
		this.commands[this.counter++] = LINE_CAP;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStringId(val);;
	}

	public save(): void {
		this.commands[this.counter++] = SAVE;
		this.commands[this.counter++] = 0;
	}

	public restore(): void {
		this.commands[this.counter++] = RESTORE;
		this.commands[this.counter++] = 0;
	}

	public measureText(text: string): TextMetrics {
		ctxForMeasure.font = this.__font;
		return ctxForMeasure.measureText(text);
	}

	public clearRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = CLEAR_RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
	}

	public fillRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = FILL_RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
	}

	public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
		this.commands[this.counter++] = STROKE_TEXT;
		this.commands[this.counter++] = maxWidth !== undefined ? 4 : 3;
		this.commands[this.counter++] = this.getStringId(text);
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		if (maxWidth !== undefined) {
			this.commands[this.counter++] = maxWidth;
		}
	}

	public setLineDash(): void {
		// console.log('dash')
		// this.commands[this.counter++] = SET_LINE_DASH;
		// this.commands[this.counter++] = 1;
		// this.commands[this.counter++] = segments;
	}

	public fillText(text: string, x: number, y: number, maxWidth?: number | undefined): void {
		this.commands[this.counter++] = FILL_TEXT;
		this.commands[this.counter++] = maxWidth !== undefined ? 4 : 3;
		this.commands[this.counter++] = this.getStringId(text);
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		if (maxWidth !== undefined) {
			this.commands[this.counter++] = maxWidth;
		}
	}

	public rect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
	}

	public clip(fillRule?: CanvasFillRule | undefined): void;
	public clip(path: Path2D, fillRule?: CanvasFillRule | undefined): void;
	public clip(...args: unknown[]): void {
		this.commands[this.counter++] = CLIP;
		this.commands[this.counter++] = args.length;
		for (const arg of args) {
			// @ts-ignore
			this.commands[this.counter++] = arg;
		}
	}

	public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		this.commands[this.counter++] = QUADRATIC_CURVE_TO;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = cpx;
		this.commands[this.counter++] = cpy;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
	}

	public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
		this.commands[this.counter++] = BEZIER_CURVE_TO;
		this.commands[this.counter++] = 6;
		this.commands[this.counter++] = cp1x;
		this.commands[this.counter++] = cp1y;
		this.commands[this.counter++] = cp2x;
		this.commands[this.counter++] = cp2y;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
	}

	public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
		return new ImageData(sw, sh);
	}

	public beginPath(): void {
		this.commands[this.counter++] = BEGIN_PATH;
		this.commands[this.counter++] = 0;
	}

	public moveTo(x: number, y: number): void {
		this.commands[this.counter++] = MOVE_TO;
		this.commands[this.counter++] = 2;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
	}

	public lineTo(x: number, y: number): void {
		this.commands[this.counter++] = LINE_TO;
		this.commands[this.counter++] = 2;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
	}

	public stroke(): void {
		this.commands[this.counter++] = STROKE;
		this.commands[this.counter++] = 0;
	}

	public fill(): void {
		this.commands[this.counter++] = FILL;
		this.commands[this.counter++] = 0;
	}

	public closePath(): void {
		this.commands[this.counter++] = CLOSE_PATH;
		this.commands[this.counter++] = 0;
	}

	public strokeRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = STROKE_RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
	}

	public scale(x: number, y: number): void {
		this.commands[this.counter++] = SCALE;
		this.commands[this.counter++] = 2;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
	}
}
