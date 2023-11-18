import { expose } from 'comlink';

export class OffscreenWorker {

    constructor() {
        this.canvases = {};
        this.ctxs = {};
    }
    
    addCanvas(canvasId, canvas) {
        this.canvases[canvasId] = canvas;
    }

    executeCanvasCommands(commands) {
        commands.forEach(command => {
            const [canvasId, method, ...args] = command;
            const canvas = this.canvases[canvasId];
            if (canvas) {
                let ctx = this.ctxs[canvasId];
                if (ctx === undefined) {
                    ctx =canvas.getContext('2d');
                    this.ctxs[canvasId] = ctx;
                }
                if (ctx[method] instanceof Function) {
                    ctx[method](...args);
                } else {
                    ctx[method] = args[0];
                }
            }
        });
    }
    
}

expose(OffscreenWorker);