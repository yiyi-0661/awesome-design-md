"use client";

import { useEffect, useMemo, useState } from "react";

type Vector = { x: number; y: number };
type HelixPoint = Vector & {
  centerX: number;
  centerY: number;
  depth: number;
  tangent: Vector;
};

const SAMPLE_COUNT = 72;
const TURNS = 6.2;
const BEND = 0.54;
const TAU = Math.PI * 2;
const stable = (value: number) => Number(value.toFixed(3));

const lowerCurve: [Vector, Vector, Vector, Vector] = [
  { x: 55, y: 610 },
  { x: -10, y: 415 },
  { x: 235, y: 315 },
  { x: 390, y: 335 }
];

const upperCurve: [Vector, Vector, Vector, Vector] = [
  lowerCurve[3],
  { x: 545, y: 355 },
  { x: 475, y: 95 },
  { x: 735, y: 35 }
];

function cubicPoint(t: number, [p0, p1, p2, p3]: [Vector, Vector, Vector, Vector]) {
  const one = 1 - t;
  return {
    x: one ** 3 * p0.x + 3 * one ** 2 * t * p1.x + 3 * one * t ** 2 * p2.x + t ** 3 * p3.x,
    y: one ** 3 * p0.y + 3 * one ** 2 * t * p1.y + 3 * one * t ** 2 * p2.y + t ** 3 * p3.y
  };
}

function cubicTangent(t: number, [p0, p1, p2, p3]: [Vector, Vector, Vector, Vector]) {
  const one = 1 - t;
  const dx = 3 * one ** 2 * (p1.x - p0.x) + 6 * one * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x);
  const dy = 3 * one ** 2 * (p1.y - p0.y) + 6 * one * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y);
  const length = Math.max(1, Math.hypot(dx, dy));
  return { x: dx / length, y: dy / length };
}

function pointOnStrand(center: Vector, tangent: Vector, normal: Vector, phase: number, side: 1 | -1): HelixPoint {
  const depth = Math.sin(phase) * side;
  const lateral = Math.cos(phase) * 74 * side;
  const depthShift = depth * 8;
  return {
    x: stable(center.x + normal.x * lateral + tangent.x * depthShift),
    y: stable(center.y + normal.y * lateral + tangent.y * depthShift),
    depth: stable(depth),
    tangent,
    centerX: center.x,
    centerY: center.y
  };
}

export function DnaHelix() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let lastPaint = 0;
    const startedAt = performance.now();
    const animate = (now: number) => {
      if (now - lastPaint > 32) {
        setElapsed(now - startedAt);
        lastPaint = now;
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const geometry = useMemo(() => {
    const phaseOffset = (elapsed / 15000) * TAU;
    const strandA: HelixPoint[] = [];
    const strandB: HelixPoint[] = [];

    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      const t = index / (SAMPLE_COUNT - 1);
      const curve = t < BEND ? lowerCurve : upperCurve;
      const localT = t < BEND ? t / BEND : (t - BEND) / (1 - BEND);
      const center = cubicPoint(localT, curve);
      const tangent = cubicTangent(localT, curve);
      const normal = { x: -tangent.y, y: tangent.x };
      const drift = 3 * Math.sin(elapsed / 4200 + t * TAU);
      center.x += normal.x * drift;
      center.y += normal.y * drift;
      const phase = t * TAU * TURNS + phaseOffset;
      strandA.push(pointOnStrand(center, tangent, normal, phase, 1));
      strandB.push(pointOnStrand(center, tangent, normal, phase, -1));
    }

    return { strandA, strandB };
  }, [elapsed]);

  const railSegments = (points: HelixPoint[], prefix: string) => points.slice(1).map((point, index) => {
    const from = points[index];
    const depth = (from.depth + point.depth) / 2;
    return { from, to: point, depth, key: `${prefix}-${index}` };
  });
  const allSegments = [...railSegments(geometry.strandA, "a"), ...railSegments(geometry.strandB, "b")];
  const renderSegment = ({ from, to, depth, key }: ReturnType<typeof railSegments>[number]) => (
    <line
      className="dna-backbone"
      key={key}
      opacity={stable(0.3 + (depth + 1) * 0.32)}
      strokeWidth={stable(0.8 + (depth + 1) * 0.6)}
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
    />
  );

  return (
    <figure className="dna-figure" aria-label="Animated DNA double helix">
      <svg viewBox="0 0 780 610" role="img" aria-labelledby="dna-title dna-desc">
        <title id="dna-title">A rotating DNA double helix</title>
        <desc id="dna-desc">A broad DNA double helix follows a smooth open curve from the lower left toward the upper right while the complete molecule rotates.</desc>
        <g className="dna-structure">
          {allSegments.filter(({ depth }) => depth < 0).map(renderSegment)}
          {geometry.strandA.map((a, index) => {
            const b = geometry.strandB[index];
            const facing = Math.abs(a.depth);
            const highlighted = index >= 33 && index <= 37;
            const accent = index % 2 === 0 ? "pink" : "green";
            const atomRadiusA = stable(3.1 + (a.depth + 1) * 0.92);
            const atomRadiusB = stable(3.1 + (b.depth + 1) * 0.92);
            const atomOpacityA = stable(0.44 + (a.depth + 1) * 0.25);
            const atomOpacityB = stable(0.44 + (b.depth + 1) * 0.25);
            return (
              <g key={index}>
                <line
                  className={`dna-rung ${highlighted ? `dna-rung-accent-${accent}` : ""}`}
                  opacity={highlighted ? 0.94 : stable(0.25 + facing * 0.43)}
                  strokeWidth={highlighted ? 2.4 : stable(0.7 + facing * 0.6)}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
                <circle className={`dna-atom ${highlighted ? `dna-atom-accent-${accent}` : ""}`} cx={a.x} cy={a.y} opacity={atomOpacityA} r={atomRadiusA} />
                <circle className={`dna-atom ${highlighted ? `dna-atom-accent-${accent}` : ""}`} cx={b.x} cy={b.y} opacity={atomOpacityB} r={atomRadiusB} />
              </g>
            );
          })}
          {geometry.strandA.map((a, index) => {
            if (index % 2 !== 0) return null;
            const b = geometry.strandB[index];
            const sideIndex = index / 2;
            const makeEnd = (point: HelixPoint, direction: number) => {
              const outwardX = point.x - point.centerX;
              const outwardY = point.y - point.centerY;
              const outwardLength = Math.max(1, Math.hypot(outwardX, outwardY));
              const modulation = 10 + 4 * Math.sin(sideIndex * 1.73 + direction);
              return {
                x: stable(point.x + (outwardX / outwardLength) * modulation + point.tangent.x * Math.sin(sideIndex * 2.1) * 3),
                y: stable(point.y + (outwardY / outwardLength) * modulation + point.tangent.y * Math.sin(sideIndex * 2.1) * 3)
              };
            };
            const endA = makeEnd(a, 1);
            const endB = makeEnd(b, -1);
            return (
              <g key={`side-${index}`}>
                <line className="dna-side-bond" x1={a.x} y1={a.y} x2={endA.x} y2={endA.y} opacity={stable(0.18 + (a.depth + 1) * 0.17)} />
                <line className="dna-side-bond" x1={b.x} y1={b.y} x2={endB.x} y2={endB.y} opacity={stable(0.18 + (b.depth + 1) * 0.17)} />
                <circle className="dna-side-atom" cx={endA.x} cy={endA.y} r={stable(1.4 + (a.depth + 1) * 0.36)} opacity={stable(0.36 + (a.depth + 1) * 0.18)} />
                <circle className="dna-side-atom" cx={endB.x} cy={endB.y} r={stable(1.4 + (b.depth + 1) * 0.36)} opacity={stable(0.36 + (b.depth + 1) * 0.18)} />
              </g>
            );
          })}
          {allSegments.filter(({ depth }) => depth >= 0).map(renderSegment)}
        </g>
      </svg>
      <figcaption>PROGRAMMABLE DOUBLE HELIX · LIVE STRUCTURE</figcaption>
    </figure>
  );
}
