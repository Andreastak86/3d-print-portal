"use client";

import { useState } from "react";

const COLORS = ["#ff7a45", "#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];
const PIECES = 90;

interface Piece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  size: number;
  drift: number;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.5 + Math.random() * 2,
    color: COLORS[i % COLORS.length],
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 200,
  }));
}

/** CSS-only confetti. Shown once when mounted (give it a new key to replay). */
export function Confetti() {
  const [pieces] = useState(makePieces);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.45,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--rot": `${p.rotate}deg`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
