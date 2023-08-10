export function drawRoundedRect(ctx, x, y, width, height, radius = 4, fill = true, stroke = false) {
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
	if (fill) {
		ctx.fill();
	}
	if (stroke) {
		ctx.stroke();
	}
	ctx.restore();
}

export class CustomCrosstoolDrawer {
	constructor(config, canvasBoundsContainer, chartModel, paneManager) {
		this.config = config;
		this.canvasBoundsContainer = canvasBoundsContainer;
		this.chartModel = chartModel;
		this.paneManager = paneManager;
	}

	draw(ctx, hover) {
		this.drawCrossTool(ctx, hover);
		this.drawXLabel(ctx, hover);
		this.drawMagnetPrice(ctx, hover);
	}

	drawCrossTool(ctx, hover) {
		const allPanes = this.canvasBoundsContainer.getBounds('ALL_PANES');
		const xAxisTopPadding = this.config.components.xAxis.padding.top ?? 0;

		const verticalLineCoords = {
			start: [hover.x, allPanes.y],
			end: [hover.x, allPanes.y + allPanes.height + xAxisTopPadding],
		};
		ctx.strokeStyle = this.config.colors.crossTool.lineColor;
		ctx.beginPath();

		ctx.moveTo(...verticalLineCoords.start);
		ctx.lineTo(...verticalLineCoords.end);
		ctx.stroke();
	}

	drawXLabel(ctx, hover) {
		const xLabelPadding = this.config.components.crossTool.xLabel.padding;
		const xLabelMargin = this.config.components.crossTool.xLabel.margin;
		const crossToolColors = this.config.colors.crossTool;
		// X axis label same for all
		if (this.config.components.xAxis.visible) {
			ctx.font = this.config.components.xAxis.fontSize + 'px ' + this.config.components.xAxis.fontFamily;
			// X hover
			const x = hover.x;
			const labelText = hover.time;
			const width = ctx.measureText(labelText).width;
			const fontHeight = this.config.components.xAxis.fontSize;
			// box
			const xAxis = this.canvasBoundsContainer.getBounds('X_AXIS');
			ctx.save();
			ctx.fillStyle = crossToolColors.labelBoxColor;
			const xLabelPaddingLeft = xLabelPadding?.left ?? 0;
			const xLabelPaddingRight = xLabelPadding?.right ?? 0;
			const xLabelPaddingTop = xLabelPadding?.top ?? 0;
			const xLabelPaddingBottom = xLabelPadding?.bottom ?? 0;
			const xLabelMarginTop = xLabelMargin?.top ?? 0;
			const boxWidth = width + xLabelPaddingLeft + xLabelPaddingRight;
			const boxHeight = fontHeight + xLabelPaddingTop + xLabelPaddingBottom;
			const xBoxPos = Math.max(x - boxWidth / 2, 0);
			const yBoxPos = xAxis.y + xLabelMarginTop;
			drawRoundedRect(ctx, xBoxPos, yBoxPos, boxWidth, boxHeight);
			// label
			ctx.fillStyle = crossToolColors.labelTextColor;
			const xTextPos = Math.max(x - width / 2, xLabelPaddingLeft);
			const yTextPos = xAxis.y + xLabelMarginTop + fontHeight + xLabelPaddingTop - 1; // -1 for vertical adjustment
			ctx.fillText(labelText, xTextPos, yTextPos);
			ctx.restore();
		}
	}

	drawMagnetPrice(ctx, hover) {
		const xLabelPadding = this.config.components.crossTool.xLabel.padding;
		const xLabelMargin = this.config.components.crossTool.xLabel.margin;
		const crossToolColors = this.config.colors.crossTool;
		if (this.config.components.xAxis.visible) {
			ctx.font = this.config.components.xAxis.fontSize + 'px ' + this.config.components.xAxis.fontFamily;
			// X hover
			const x = hover.x;
			const y = hover.y;
			// use can use here your own formatter
			const labelText = this.chartModel.pane.regularFormatter(this.chartModel.priceFromY(y));
			const width = ctx.measureText(labelText).width;
			const fontHeight = this.config.components.xAxis.fontSize;
			// box
			ctx.save();
			ctx.fillStyle = crossToolColors.labelBoxColor;
			const xLabelPaddingLeft = xLabelPadding?.left ?? 0;
			const xLabelPaddingRight = xLabelPadding?.right ?? 0;
			const xLabelPaddingTop = xLabelPadding?.top ?? 0;
			const xLabelPaddingBottom = xLabelPadding?.bottom ?? 0;
			const xLabelMarginTop = xLabelMargin?.top ?? 0;
			const boxWidth = width + xLabelPaddingLeft + xLabelPaddingRight;
			const boxHeight = fontHeight + xLabelPaddingTop + xLabelPaddingBottom;
			const xBoxPos = Math.max(x + 10, 0);
			const yBoxPos = y + xLabelMarginTop;
			drawRoundedRect(ctx, xBoxPos, yBoxPos, boxWidth, boxHeight);
			ctx.arc(x, y, 5, 0, Math.PI * 2);
			ctx.fill();
			// label
			ctx.fillStyle = crossToolColors.labelTextColor;
			const xTextPos = Math.max(x + 10 + xLabelPaddingLeft, 0);
			const yTextPos = hover.y + xLabelMarginTop + fontHeight + xLabelPaddingTop - 1; // -1 for vertical adjustment
			ctx.fillText(labelText, xTextPos, yTextPos);
			ctx.restore();
		}
	}
}
