'use client';

import { useMemo } from 'react';
import { generateQRMatrix } from '@/lib/qrCode';

interface Props {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

export default function QRCodeView({
  value,
  size = 160,
  className = '',
  darkColor = '#00ffb2',
  lightColor = '#030812',
}: Props) {
  const matrix = useMemo(() => generateQRMatrix(value || 'AURA'), [value]);
  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  return (
    <div
      className={`inline-flex items-center justify-center p-3 rounded-2xl border border-emerald-500/30 shadow-[0_0_25px_rgba(0,255,178,0.18)] ${className}`}
      style={{ backgroundColor: lightColor }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={size} height={size} fill={lightColor} rx={8} />
        {matrix.map((row, r) =>
          row.map((filled, c) => {
            if (!filled) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.3}
                height={cellSize + 0.3}
                fill={darkColor}
                rx={cellSize > 5 ? 1 : 0}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}

