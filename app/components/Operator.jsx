  'use client';

  import React, { useState } from 'react';
  import { margin, operators, size } from '../data/operators.jsx';
  import { Eye } from 'lucide-react';

  export default function Operator({
    title,
    itemId,
    fill,
    height,
    width,
    components,
    isCustom,
    symbol,
    style = {},
    xRayGateId,
    setXRayGateId,
  }) {
    // const [isXRayMode, setIsXRayMode] = useState(false);
    const findOperator = (id) => operators.find((op) => op.id === id);
    const isXRayMode = xRayGateId === itemId;
    return (
      <div style={{ ...style }} className="group relative">
        <svg
          className={`z-40 absolute top-0 left-0 ${isXRayMode && "scale-95 "}`}
          height={height * size + margin.y * (height - 1)}
          width={
            isXRayMode
              ? (Math.max(...components.map((c) => c.x)) -
                  Math.min(...components.map((c) => c.x)) +
                  1) *
                  (size + margin.x) -
                margin.x
              : size
          }
          overflow="visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            fill={isXRayMode ? "white" : fill} // white bg on expand, else normal fill
            stroke={isXRayMode ? "red" : "none"} // red border on expand
            strokeDasharray={isXRayMode ? "4 4" : "none"} // dotted pattern on expand
            strokeWidth={isXRayMode ? 2 : 0}
            height={height * size + (height - 1) * margin.y}
            rx="4"
            width={
              isXRayMode
                ? (Math.max(...components.map((c) => c.x)) -
                    Math.min(...components.map((c) => c.x)) +
                    1) *
                    (size + margin.x) -
                  margin.x
                : size
            }
            x="0"
            y="0"
          />
          {!isXRayMode && symbol}

          {/* Render components inside the expanded (XRay) view */}
          {isXRayMode &&
            components.map((comp, idx) => {
              const compOp = findOperator(comp.gateId);

              if (!compOp) return null;

              // Position each component inside the grid
              return (
                <g
                  key={idx}
                  transform={`translate(${comp.x * (size + margin.x)}, ${
                    comp.y * (size + margin.y)
                  })`}
                  style={{ cursor: "default" }}
                >
                  <rect
                    fill={compOp.fill}
                    height={comp.h * size + (comp.h - 1) * margin.y}
                    width={comp.w * size + (comp.w - 1) * margin.x}
                    rx="4"
                  />
                  <svg
                    x={0}
                    y={0}
                    width={comp.w * size + (comp.w - 1) * margin.x}
                    height={comp.h * size + (comp.h - 1) * margin.y}
                    overflow="visible"
                  >
                    {compOp.icon}
                  </svg>
                </g>
              );
            })}
        </svg>
        {isCustom && (
          <button
            aria-label="Toggle X-Ray Mode"
            className={`${
              !isXRayMode && "group-hover:block hidden"
            } relative top-0 left-0 bg-white cursor-pointer border border-gray-300 z-50 rounded-full shadow -translate-1/2`}
            onClick={(e) => {
              e.stopPropagation();
              setXRayGateId(isXRayMode ? null : itemId);
            }}
            style={{
              width: 18,
              height: 18,
              minWidth: 0,
              padding: 0,
              zIndex: 100,
            }}
          >
            {isXRayMode ? (
              <Eye size={14} color="lightblue" />
            ) : (
              <Eye size={14} />
            )}
          </button>
        )}
      </div>
    );
  }