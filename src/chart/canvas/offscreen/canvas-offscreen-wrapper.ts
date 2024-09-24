import { CanvasModel } from '../../model/canvas.model';
import { ctxForMeasure } from '../../utils/canvas/canvas-font-measure-tool.utils';
import {
	ARC,
	BEGIN_PATH,
	BEZIER_CURVE_TO,
	CLEAR_RECT,
	CLIP,
	CLOSE_PATH,
	DIRECTION,
	END_OF_FILE,
	FILL,
	FILL_RECT,
	FILL_STYLE,
	FILL_TEXT,
	FONT,
	FONT_KERNING,
	HEIGHT,
	LINE_CAP,
	LINE_JOIN,
	LINE_TO,
	LINE_WIDTH,
	MOVE_TO,
	NOP,
	QUADRATIC_CURVE_TO,
	RECT,
	REDRAW_BACKGROUND_AREA,
	RESTORE,
	ROTATE,
	SAVE,
	SCALE,
	SET_GRADIENT_FILL_STYLE,
	SET_LINE_DASH_FLAT,
	STROKE,
	STROKE_RECT,
	STROKE_STYLE,
	STROKE_TEXT,
	TEXT_ALIGN,
	TEXT_BASELINE,
	TRANSLATE,
	WIDTH,
} from './canvas-ctx.mapper';

/**
 * We use this counter to generate unique ids for strings.
 * I've used Number.MIN_SAFE_INTEGER, because it's unlikely that we will have more than 2^53 strings
 * and it's unlikely to have negative arguments (especially big ones) for canvas commands on chart.
 */
let curPtr = -1_000_000;
/**
 * Global pool of strings which is used to synchronize strings between main thread and worker thread.
 * It's intentional that this map is global, because we want to have common strings pool between all charts.
 * The goal of this pool is to have a unique string id for each string and write this id to the shared buffer,
 * so we don't have to encode and write the string to the buffer (encoding string is not an easy task,
 * also on repeated encodings it'll be much faster since we write only one number instead of array of bytes for corresponding string).
 */
const stringPtrs = new Map<string, number>();
// an array of strings and their ids which should be synchronized between main thread and worker thread
// the format of data in this array is [str1, id1, str2, id2, ...]
export const strsToSync: Array<string | number> = [];

/**
 * A canvas wrapper which partly implements CanvasRenderingContext2D interface.
 * It's used to record all canvas commands from the main thread and store it in SharedArrayBuffer.
 * When the main thread needs to render the chart, it sends the command to worker thread, which executes it on the offscreen canvas.
 * SharedArrayBuffer is much faster than sending commands, because it's shared memory, so it's not copied between threads.
 *
 * In order to utilize SharedArrayBuffer, we need to use array wrapper (Float64Array in our case), so we can store only number.
 * In order to encode commands and their arguments, we use a simple encoding scheme:
 * First number is a command id, the second number is a number of arguments, and the rest are arguments. For instance [26, 2, 2, 2] which means "scale(2, 2)"
 * Please refer to canvas-ctx.mapper.ts for the full list of commands and their encodings.
 *
 * However, there are some commands which can't be encoded in this way, for instance "fillStyle = 'red'".
 * In this case we store the string in the global pool (strSync) and write the id (number) of the string to the buffer.
 * After that, before the draw command we need to perform synchronization of this pool between main thread and worker thread.
 */
export class CanvasOffscreenContext2D implements CanvasRenderingContext2D {
	public commands!: Float32Array;
	public buffer!: SharedArrayBuffer;
	/**
	 * Current canvas commands pointer which indicates position of the next command in the buffer.
	 */
	private counter = 0;

	private getStrPtr(str: string): number {
		let id = stringPtrs.get(str);
		if (id === undefined) {
			id = --curPtr;
			strsToSync.push(str, id);
			stringPtrs.set(str, id);
		}
		return id;
	}

	private __font: string = '12px Arial';

	constructor(public canvas: HTMLCanvasElement) {}

	initBuffer(buffer: SharedArrayBuffer) {
		this.buffer = buffer;
		this.commands = new Float32Array(this.buffer);
		this.commit();
	}

	commit() {
		if (this.counter >= this.commands.length) {
			console.error('Buffer overflow');
			this.commands[0] = END_OF_FILE;
		} else {
			this.commands[this.counter] = END_OF_FILE;
		}
		this.counter = 0;
	}

	nop() {
		this.commands[this.counter++] = NOP;
	}

	set font(val: string) {
		this.__font = val;
		this.commands[this.counter++] = FONT;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	get font(): string {
		return this.__font;
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

	set fillStyle(val: string) {
		this.commands[this.counter++] = FILL_STYLE;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	set strokeStyle(val: string) {
		this.commands[this.counter++] = STROKE_STYLE;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	set lineWidth(val: number) {
		this.commands[this.counter++] = LINE_WIDTH;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = val;
	}

	set lineCap(val: CanvasLineCap) {
		this.commands[this.counter++] = LINE_CAP;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
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

	public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
		return ctxForMeasure.createLinearGradient(x0, y0, x1, y1);
	}

	putImageData(): void {
		// this.commands[this.counter++] = PUT_IMAGE_DATA_FLAT;
		// this.commands[this.counter++] = 2 + imagedata.data.length;
		// this.commands[this.counter++] = dx;
		// this.commands[this.counter++] = dy;
		// for (let i = 0; i < imagedata.data.length; i++) {
		// 	this.commands[this.counter++] = imagedata.data[i];
		// }
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
	}

	public setLineDash(dash: number[]): void {
		this.__lineDash = dash;
		this.commands[this.counter++] = SET_LINE_DASH_FLAT;
		this.commands[this.counter++] = dash.length;
		for (const el of dash) {
			this.commands[this.counter++] = el;
		}
	}

	private __lineDash: number[] = [];

	public getLineDash(): number[] {
		return this.__lineDash;
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
	}

	public rect(x: number, y: number, w: number, h: number): void {
		this.commands[this.counter++] = RECT;
		this.commands[this.counter++] = 4;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
	}

	public clip(): void {
		this.commands[this.counter++] = CLIP;
		this.commands[this.counter++] = 0;
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

	/**
	 * Special method for gradient fill, because we can't transfer CanvasGradient directly to offscreen.
	 * Is equivalent for following code:
	 * 		const grd = ctx.createLinearGradient(x, y, w, h);
	 * 		grd.addColorStop(offset0, color0);
	 *		grd.addColorStop(offset1, color1);
	 *		ctx.fillStyle = grd;
	 */
	public setGradientFillStyle(
		x: number,
		y: number,
		w: number,
		h: number,
		offset0: number,
		color0: string,
		offset1: number,
		color1: string,
	): void {
		this.commands[this.counter++] = SET_GRADIENT_FILL_STYLE;
		this.commands[this.counter++] = 8;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
		this.commands[this.counter++] = offset0;
		this.commands[this.counter++] = this.getStrPtr(color0);
		this.commands[this.counter++] = offset1;
		this.commands[this.counter++] = this.getStrPtr(color1);
	}

	public redrawBackgroundArea(
		backgroundCtxIdx: number,
		ctxIdx: number,
		x: number,
		y: number,
		w: number,
		h: number,
		opacity?: number,
	): void {
		this.commands[this.counter++] = REDRAW_BACKGROUND_AREA;
		this.commands[this.counter++] = 7;
		this.commands[this.counter++] = backgroundCtxIdx;
		this.commands[this.counter++] = ctxIdx;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
		this.commands[this.counter++] = w;
		this.commands[this.counter++] = h;
		this.commands[this.counter++] = opacity ?? 1;
	}

	translate(x: number, y: number): void {
		this.commands[this.counter++] = TRANSLATE;
		this.commands[this.counter++] = 2;
		this.commands[this.counter++] = x;
		this.commands[this.counter++] = y;
	}

	private __textBaseline: CanvasTextBaseline = 'alphabetic';

	set textBaseline(val: CanvasTextBaseline) {
		this.__textBaseline = val;
		this.commands[this.counter++] = TEXT_BASELINE;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	get textBaseline(): CanvasTextBaseline {
		return this.__textBaseline;
	}

	private __textAlign: CanvasTextAlign = 'center';

	set textAlign(val: CanvasTextAlign) {
		this.__textAlign = val;
		this.commands[this.counter++] = TEXT_ALIGN;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	get textAlign(): CanvasTextAlign {
		return this.__textAlign;
	}

	rotate(val: number): void {
		this.commands[this.counter++] = ROTATE;
		this.commands[this.counter++] = 1;
		this.commands[this.counter++] = val;
	}

	private __direction: CanvasDirection = 'inherit';

	set direction(val: CanvasDirection) {
		this.__direction = val;
		this.commands[this.counter++] = DIRECTION;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	get direction(): CanvasDirection {
		return this.__direction;
	}

	private __fontKerning: CanvasFontKerning = 'auto';

	set fontKerning(val: CanvasFontKerning) {
		this.__fontKerning = val;
		this.commands[this.counter++] = FONT_KERNING;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	get fontKerning(): CanvasFontKerning {
		return this.__fontKerning;
	}

	private __lineJoin: CanvasLineJoin = 'miter';

	set lineJoin(val: CanvasLineJoin) {
		this.__lineJoin = val;
		this.commands[this.counter++] = LINE_JOIN;
		this.commands[this.counter++] = -1;
		this.commands[this.counter++] = this.getStrPtr(val);
	}

	get lineJoin(): CanvasLineJoin {
		return this.__lineJoin;
	}

	//#region unimplemented
	globalAlpha = 0;
	globalCompositeOperation = 'color' as const;
	imageSmoothingEnabled = false;
	imageSmoothingQuality = 'high' as const;
	lineDashOffset = 0;
	miterLimit = 0;
	shadowBlur = 0;
	shadowColor = '';
	shadowOffsetX = 0;
	shadowOffsetY = 0;
	filter = '';
	getContextAttributes(): CanvasRenderingContext2DSettings {
		throw new Error('Method not implemented.');
	}
	drawImage(image: CanvasImageSource, dx: number, dy: number): void;
	drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(
		image: CanvasImageSource,
		sx: number,
		sy: number,
		sw: number,
		sh: number,
		dx: number,
		dy: number,
		dw: number,
		dh: number,
	): void;
	drawImage(
		image: unknown,
		sx: unknown,
		sy: unknown,
		sw?: unknown,
		sh?: unknown,
		dx?: unknown,
		dy?: unknown,
		dw?: unknown,
		dh?: unknown,
	): void;
	drawImage(): void {
		throw new Error('Method not implemented.');
	}
	isPointInPath(x: number, y: number, fillRule?: CanvasFillRule | undefined): boolean;
	isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule | undefined): boolean;
	isPointInPath(path: unknown, x: unknown, y?: unknown, fillRule?: unknown): boolean;
	isPointInPath(): boolean {
		throw new Error('Method not implemented.');
	}
	isPointInStroke(x: number, y: number): boolean;
	isPointInStroke(path: Path2D, x: number, y: number): boolean;
	isPointInStroke(path: unknown, x: unknown, y?: unknown): boolean;
	isPointInStroke(): boolean {
		throw new Error('Method not implemented.');
	}
	createConicGradient(startAngle: number, x: number, y: number): CanvasGradient;
	createConicGradient(): CanvasGradient {
		throw new Error('Method not implemented.');
	}
	createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null;
	createPattern(): CanvasPattern | null {
		throw new Error('Method not implemented.');
	}
	createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
	createRadialGradient(): CanvasGradient {
		throw new Error('Method not implemented.');
	}
	createImageData(sw: number, sh: number, settings?: ImageDataSettings | undefined): ImageData;
	createImageData(imagedata: ImageData): ImageData;
	createImageData(sw: unknown, sh?: unknown, settings?: unknown): ImageData;
	createImageData(): ImageData {
		throw new Error('Method not implemented.');
	}
	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
	arcTo(): void {
		throw new Error('Method not implemented.');
	}
	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		counterclockwise?: boolean | undefined,
	): void;
	ellipse(): void {
		throw new Error('Method not implemented.');
	}
	roundRect(
		x: number,
		y: number,
		w: number,
		h: number,
		radii?: number | DOMPointInit | (number | DOMPointInit)[] | undefined,
	): void;
	roundRect(): void {
		throw new Error('Method not implemented.');
	}
	getTransform(): DOMMatrix {
		throw new Error('Method not implemented.');
	}
	resetTransform(): void {
		throw new Error('Method not implemented.');
	}
	setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
	setTransform(transform?: DOMMatrix2DInit | undefined): void;
	setTransform(): void {
		throw new Error('Method not implemented.');
	}
	transform(): void {
		throw new Error('Method not implemented.');
	}
	drawFocusIfNeeded(element: Element): void;
	drawFocusIfNeeded(path: Path2D, element: Element): void;
	drawFocusIfNeeded(): void {
		throw new Error('Method not implemented.');
	}
	reset(): void {
		throw new Error('Method not implemented.');
	}
	//#endregion
}

export function isOffscreenCanvasModel(model: CanvasModel): model is CanvasModel<CanvasOffscreenContext2D> {
	return model.options.offscreen ?? false;
}