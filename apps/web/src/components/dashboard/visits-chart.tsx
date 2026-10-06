"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";

import { EASE_OUT } from "@/components/motion";
import type { ChartPoint } from "@/lib/stats";

const WIDTH = 700;
const HEIGHT = 170;
const LEFT = 30;
const TOP = 8;

/** A round step above the biggest number, so the top grid line has a label like 20 or 50. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value / 4)! * magnitude;
  return Math.ceil(value / step) * step;
}

function linePath(points: [number, number][]) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/**
 * This period (solid Kariba line with a soft fill) against the one before
 * (dashed grey). Hover or tap a day for its number.
 */
export function VisitsChart({ data, empty, className }: { data: ChartPoint[]; empty?: ReactNode; className?: string }) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((point) => Math.max(point.current, point.previous)), 0));
  const plotWidth = WIDTH - LEFT;
  const x = (index: number) => LEFT + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => TOP + (1 - value / max) * (HEIGHT - TOP);
  const current = data.map((point, index) => [x(index), y(point.current)] as [number, number]);
  const previous = data.map((point, index) => [x(index), y(point.previous)] as [number, number]);
  const area = `${linePath(current)} L${x(data.length - 1)},${HEIGHT} L${x(0)},${HEIGHT} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));
  const showEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1;
  const active = hovered === null ? null : data[hovered];

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT + 26}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Visits: ${data.map((point) => `${point.label} ${point.current}`).join(", ")}`}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#007DA2" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#007DA2" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={LEFT} x2={WIDTH} y1={y(tick)} y2={y(tick)} className="stroke-line-3" strokeDasharray={tick === 0 ? undefined : "3 4"} />
            <text x={0} y={y(tick) + 4} className="fill-muted-2 text-[12px]">
              {tick}
            </text>
          </g>
        ))}

        <motion.path
          d={area}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d={linePath(previous)}
          fill="none"
          className="stroke-soft"
          strokeWidth={1.75}
          strokeDasharray="5 5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, ease: EASE_OUT }}
        />
        <motion.path
          key={data.length}
          d={linePath(current)}
          fill="none"
          stroke="#007DA2"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        />

        {active && hovered !== null ? (
          <g pointerEvents="none">
            <line x1={x(hovered)} x2={x(hovered)} y1={TOP} y2={HEIGHT} className="stroke-line-2" />
            <circle cx={x(hovered)} cy={y(active.current)} r={5} fill="white" stroke="#007DA2" strokeWidth={2.5} />
          </g>
        ) : null}

        {data.map((point, index) => (
          <g key={`${point.detail}-${index}`}>
            {index % showEvery === 0 || index === data.length - 1 ? (
              <text
                x={x(index)}
                y={HEIGHT + 22}
                textAnchor="middle"
                className={cn("text-[12px]", hovered === index ? "fill-ink font-semibold" : "fill-muted-2")}
              >
                {point.label}
              </text>
            ) : null}
            {/* Wide invisible column, so the whole day is the hover and tap target */}
            <rect
              x={x(index) - plotWidth / data.length / 2}
              y={0}
              width={plotWidth / data.length}
              height={HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onClick={() => setHovered(index)}
            />
          </g>
        ))}
      </svg>

      <AnimatePresence>
        {active && hovered !== null ? (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col gap-0.5 rounded-[10px] bg-ink px-3 py-2 text-white shadow-[0_8px_20px_rgba(12,24,31,0.2)]"
            style={{ left: `${(x(hovered) / WIDTH) * 100}%` }}
          >
            <span className="text-xs whitespace-nowrap text-[#CED6DA]">{active.detail}</span>
            <span className="text-sm font-semibold whitespace-nowrap">
              {active.current} {active.current === 1 ? "visit" : "visits"}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {empty ? (
        <div className="absolute inset-x-0 top-[20%] flex justify-center px-4">
          <div className="max-w-xs rounded-xl bg-white/90 px-4 py-3 text-center text-[13px] leading-5 text-muted shadow-pop backdrop-blur-sm">
            {empty}
          </div>
        </div>
      ) : null}
    </div>
  );
}
