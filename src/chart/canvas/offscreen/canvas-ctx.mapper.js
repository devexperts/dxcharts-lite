// #region canvas commands encodings - see commands mappings to methods below
export const FONT = 0;
export const WIDTH = 1;
export const HEIGHT = 2;
export const FILL_STYLE = 3;
export const STROKE_STYLE = 4;
export const LINE_WIDTH = 5;
export const LINE_CAP = 6;
export const SAVE = 7;
export const RESTORE = 8;
export const MEASURE_TEXT = 9;
export const CLEAR_RECT = 10;
export const FILL_RECT = 11;
export const STROKE_TEXT = 12;
export const SET_LINE_DASH = 13;
export const FILL_TEXT = 14;
export const RECT = 15;
export const CLIP = 16;
export const QUADRATIC_CURVE_TO = 17;
export const BEZIER_CURVE_TO = 18;
export const BEGIN_PATH = 19;
export const MOVE_TO = 20;
export const LINE_TO = 21;
export const STROKE = 22;
export const FILL = 23;
export const CLOSE_PATH = 24;
export const STROKE_RECT = 25;
export const SCALE = 26;
export const NOP = 27;
export const ARC = 28;
// custom method
export const SET_LINE_DASH_FLAT = 29;
// custom method
export const SET_GRADIENT_FILL_STYLE = 30;
// custom method
export const REDRAW_BACKGROUND_AREA = 31;
export const TRANSLATE = 32;
export const TEXT_BASELINE = 33;
export const TEXT_ALIGN = 34;
export const ROTATE = 35;
export const LINE_JOIN = 36;
export const DIRECTION = 37;
export const FONT_KERNING = 38;

// Special command which indicates the end of canvas commands inside the buffer
export const END_OF_FILE = 0xdead;
// #endregion

// Map from command number to canvas context method name
export const num2Ctx = [
	'font',
	'width',
	'height',
	'fillStyle',
	'strokeStyle',
	'lineWidth',
	'lineCap',
	'save',
	'restore',
	'measureText',
	'clearRect',
	'fillRect',
	'strokeText',
	'setLineDash',
	'fillText',
	'rect',
	'clip',
	'quadraticCurveTo',
	'bezierCurveTo',
	'beginPath',
	'moveTo',
	'lineTo',
	'stroke',
	'fill',
	'closePath',
	'strokeRect',
	'scale',
	'nop',
	'arc',
	'setLineDashFlat',
	'setGradientFillStyle',
	'redrawBackgroundArea',
	'translate',
	'textBaseline',
	'textAlign',
	'rotate',
	'lineJoin',
	'direction',
	'fontKerning',
];