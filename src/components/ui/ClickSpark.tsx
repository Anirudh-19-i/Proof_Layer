import React, { useState, useEffect, useCallback } from 'react';

interface Spark {
  id: number;
  x: number;
  y: number;
}

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: string;
  extraScale?: number;
}

export default function ClickSpark({
  sparkColor = "#ffffff",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  extraScale = 1
}: ClickSparkProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  const handleClick = useCallback((e: MouseEvent) => {
    const newSpark = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
    };
    setSparks((prev) => [...prev, newSpark]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
    }, duration);
  }, [duration]);

  useEffect(() => {
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [handleClick]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className="absolute"
          style={{ left: spark.x, top: spark.y }}
        >
          {[...Array(sparkCount)].map((_, i) => {
            const angle = (i * 360) / sparkCount;
            const radian = (angle * Math.PI) / 180;
            return (
              <div
                key={i}
                className="absolute bg-current rounded-full"
                style={{
                  color: sparkColor,
                  width: sparkSize,
                  height: sparkSize,
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${sparkRadius}px)`,
                  animation: `spark-animation ${duration}ms ease-out forwards`,
                }}
              />
            );
          })}
        </div>
      ))}
      <style>{`
        @keyframes spark-animation {
          0% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(calc(var(--radius) * ${extraScale})) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
