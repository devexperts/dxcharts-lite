import {
	ARC,
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
	NOP,
	QUADRATIC_CURVE_TO,
	RECT,
	RESTORE,
	SAVE,
	SCALE,
	STROKE,
	STROKE_RECT,
	STROKE_STYLE,
	STROKE_TEXT,
	WIDTH,
} from './canvas-ctx.mapper';

const END_OF_FILE = 0xdead;
const canvas = document.createElement('canvas');
// @ts-ignore
export const ctxForMeasure: CanvasRenderingContext2D = canvas.getContext('2d');

let curPtr = Number.MIN_SAFE_INTEGER;
// it's intentional that this map is global, bcs we want to have common strings pool between all charts
// the goal of this pool is to have a unique string id for each string and write this id to the shared buffer,
// so we don't have to encode and write the string to the buffer (encoding string is not an easy task, also it's cheaper to transfer only a number, not a string)
const stringPtrs = new Map<string, number>();
export const strSync: unknown[] = [];

export class CanvasOffscreenContext2D implements Partial<CanvasRenderingContext2D> {
	public commands: Float64Array;
	public buffer: SharedArrayBuffer;

	private getStrPtr(str: string): number {
		let id = stringPtrs.get(str);
		if (id === undefined) {
			id = curPtr++;
			strSync.push(str, id);
			stringPtrs.set(str, id);
		}
		return id;
	}

	private __font: string = '12px Arial';
	private counter = 0;

	constructor(public idx: number) {
		this.buffer = new SharedArrayBuffer(8 * 100000);
		this.commands = new Float64Array(this.buffer);
		this.commit();
	}

	commit() {
		this.commands[this.counter] = END_OF_FILE;
		this.counter = 0;
	}

	nop() {
		this.commands[this.counter++] = NOP;
	}

	// private __check() {
		// if (this.locked) {
		// 	// debugger;
		// }
	// }

	set font(val: string) {
		this.__font = val;
		this.commands[this.counter++] = FONT;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);

		// this.__check() ;
	}

	set width(val: number) {
		this.commands[this.counter++] = WIDTH;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = val;

		// this.__check() ;
	}

	set height(val: number) {
		this.commands[this.counter++] = HEIGHT;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = val;

		// this.__check() ;
	}

	set fillStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands[this.counter++] = FILL_STYLE;
		this.commands[this.counter++] = -1;
		// @ts-ignore
		this.commands[this.counter++] = this.getStrPtr(val);

		// this.__check() ;
	}

	set strokeStyle(val: string | CanvasGradient | CanvasPattern | undefined) {
		this.commands[this.counter++] = STROKE_STYLE;
		this.commands[this.counter++] = -1;
		// @ts-ignore
		this.commands[this.counter++] = this.getStrPtr(val);

		// this.__check() ;
	}

	set lineWidth(val: number) {
		this.commands[this.counter++] = LINE_WIDTH;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = val;

		// this.__check() ;
	}

	set lineCap(val: CanvasLineCap) {
		this.commands[this.counter++] = LINE_CAP;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);

		// this.__check() ;
	}

	public save(): void {
		this.commands[this.counter++] = SAVE;
		this.commands[this.counter++] = 0;

		// this.__check() ;
	}

	public restore(): void {
		this.commands[this.counter++] = RESTORE;
		this.commands[this.counter++] = 0;

		// this.__check() ;
	}

	public measureText(text: string): TextMetrics {
		ctxForMeasure.font = this.__font;
		return ctxForMeasure.measureText(text);
	}

	public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
		return ctxForMeasure.createLinearGradient(x0, y0, x1, y1);
	}

	putImageData(imagedata: ImageData, dx: number, dy: number): void;
	putImageData(
		imagedata: ImageData,
		dx: number,
		dy: number,
		dirtyX: number,
		dirtyY: number,
		dirtyWidth: number,
		dirtyHeight: number,
	): void;
	putImageData(
		imagedata: unknown,
		dx: unknown,
		dy: unknown,
		dirtyX?: unknown,
		dirtyY?: unknown,
		dirtyWidth?: unknown,
		dirtyHeight?: unknown,
	): void {}

	public clearRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = CLEAR_RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;

		// this.__check() ;
	}

	public fillRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = FILL_RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;

		// this.__check() ;
	}

	public arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		counterclockwise?: boolean | undefined,
	): void {
		this.commands[this.counter++] = ARC;
		this.commands[this.counter++] = counterclockwise === undefined ? 5 : 6;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = radius;
		this.commands[this.counter++] = startAngle;
		this.commands[this.counter++] = endAngle;
		if (counterclockwise !== undefined) {
			this.commands[this.counter++] = counterclockwise ? 1 : 0;
		}
	}

	public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
		this.commands[this.counter++] = STROKE_TEXT;
		this.commands[this.counter++] = maxWidth !== undefined ? 4 : 3;
		this.commands[this.counter++] = this.getStrPtr(text);
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		if (maxWidth !== undefined) {
			this.commands[this.counter++] = maxWidth;
		}

		// this.__check() ;
	}

	public setLineDash(): void {
		// this.commands[this.counter++] = SET_LINE_DASH;
		// this.commands[this.counter++] = 1;
		// this.commands[this.counter++] = segments;
	}

	public fillText(text: string, x: number, y: number, maxWidth?: number | undefined): void {
		this.commands[this.counter++] = FILL_TEXT;
		this.commands[this.counter++] = maxWidth !== undefined ? 4 : 3;
		this.commands[this.counter++] = this.getStrPtr(text);
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		if (maxWidth !== undefined) {
			this.commands[this.counter++] = maxWidth;
		}

		// this.__check() ;
	}

	public rect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;

		// this.__check() ;
	}

	public clip(): void {
		this.commands[this.counter++] = CLIP;
		this.commands[this.counter++] = 0;

		// this.__check() ;
	}

	public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		this.commands[this.counter++] = QUADRATIC_CURVE_TO;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = cpx;
		this.commands[this.counter++] = cpy;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;

		this.commands[this.counter] = END_OF_FILE;
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

		// this.__check() ;
	}

	public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
		return new ImageData(sw, sh);
	}

	public beginPath(): void {
		this.commands[this.counter++] = BEGIN_PATH;
		this.commands[this.counter++] = 0;

		// this.__check() ;
	}

	public moveTo(x: number, y: number): void {
		this.commands[this.counter++] = MOVE_TO;
		this.commands[this.counter++] = 2;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;

		// this.__check() ;
	}

	public lineTo(x: number, y: number): void {
		this.commands[this.counter++] = LINE_TO;
		this.commands[this.counter++] = 2;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;

		// this.__check() ;
	}

	public stroke(): void {
		this.commands[this.counter++] = STROKE;
		this.commands[this.counter++] = 0;

		// this.__check() ;
	}

	public fill(): void {
		this.commands[this.counter++] = FILL;
		this.commands[this.counter++] = 0;

		// this.__check() ;
	}

	public closePath(): void {
		this.commands[this.counter++] = CLOSE_PATH;
		this.commands[this.counter++] = 0;

		// this.__check() ;
	}

	public strokeRect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = STROKE_RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;

		// this.__check() ;
	}

	public scale(x: number, y: number): void {
		this.commands[this.counter++] = SCALE;
		this.commands[this.counter++] = 2;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;

		// this.__check() ;
	}
}
