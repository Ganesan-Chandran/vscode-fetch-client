import React from "react";

interface IProps {
	points: number[];
	width?: number;
	height?: number;
}

export const ResponseTimeChart = ({
	points,
	width = 640,
	height = 140,
}: IProps) => {
	if (!points || points.length === 0) {
		return <div className="perf-chart-empty">No data yet</div>;
	}

	const padding = 8;
	const max = Math.max(...points, 1);
	const min = Math.min(...points, 0);
	const range = Math.max(max - min, 1);

	const maxPoints = 200;
	const step = Math.max(1, Math.floor(points.length / maxPoints));
	const sampled = points.filter((_, i) => i % step === 0);

	const stepX = (width - padding * 2) / Math.max(sampled.length - 1, 1);

	const coords = sampled.map((v, i) => {
		const x = padding + i * stepX;
		const y = height - padding - ((v - min) / range) * (height - padding * 2);
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

	const linePath = `M ${coords.join(" L ")}`;
	const areaPath = `${linePath} L ${padding + (sampled.length - 1) * stepX},${height - padding} L ${padding},${height - padding} Z`;

	return (
		<svg
			className="perf-chart-svg"
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
		>
			<path d={areaPath} className="perf-chart-area" />
			<path d={linePath} className="perf-chart-line" fill="none" />
		</svg>
	);
};
