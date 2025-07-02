
  import ReactGridLayout from "react-grid-layout";
  import React, { useEffect } from "react";
  import Operator from "./Operator";
  import { margin, operators, size } from "../data/operators";

  // constants describing grid layout
  const circuitContainerPadding = {
    x: 0,
    y: 0,
  };
  const containerPadding = {
    x: 10,
    y: 10,
  };
  const circuitLineMarginL = 40;
  const circuitLineMarginR = 50;
  const gridDimenY = 3; // Number of rows in the grid 
  const gridDimenX = 10; // Number of columns in the grid

  export default function CircuitCanvas({
    droppingItem,
    xRayGateId,
    setXRayGateId,
  }) {
    const [layout, setLayout] = React.useState([]);
    const [droppingItemHeight, setDroppingItemHeight] = React.useState(1);
    const [draggedItemId, setDraggedItemId] = React.useState(null);

    useEffect(() => {
      if (!droppingItem) return;
      const op = operators.find((op) => op.id === droppingItem);
      setDroppingItemHeight(op?.height ?? 1);
    }, [droppingItem]);

    // Use default width for dropping item
    const droppingItemWidth = React.useMemo(() => {
      if (!droppingItem) return 1;
      const op = operators.find((op) => op.id === droppingItem);
      if (!op) return 1;
      return op.width || 1; // Use default width (w: 1 for CustomGate)
    }, [droppingItem]);

    useEffect(() => {
      if (!xRayGateId) {
        // Reset to default widths when X-Ray mode is off
        setLayout((prevLayout) =>
          prevLayout.map((item) => ({
            ...item,
            w: operators.find((op) => op.id === item.gateId)?.width || 1,
          }))
        );
        return;
      }

      // Find the gate in X-Ray mode
      const xRayItem = layout.find((item) => item.i === xRayGateId);
      if (!xRayItem) return;

      const gate = operators.find((op) => op.id === xRayItem.gateId);
      if (!gate?.components?.length) return;

      // Calculate expanded width
      const minX = Math.min(...gate.components.map((c) => c.x));
      const maxX = Math.max(...gate.components.map((c) => c.x));
      const expandedWidth = maxX - minX + 1;

      // Check if expansion fits within grid
      if (xRayItem.x + expandedWidth > gridDimenX) {
        console.warn("Cannot expand CustomGate: insufficient space in grid.");
        setXRayGateId(null); // Prevent X-Ray mode
        return;
      }

      // Shift gates in all rows that overlap with CG gate's columns
      const updatedLayout = shiftLayoutForWideGate(
        layout.map((item) =>
          item.i === xRayGateId ? { ...item, w: expandedWidth } : item
        ),
        xRayItem.x,
        expandedWidth,
        gridDimenX,
        xRayGateId
      );

      setLayout(updatedLayout);
    }, [xRayGateId, setXRayGateId]);

    const handleCircuitChange = (newCircuit) => {
      setLayout(newCircuit.layout);
    };

    function shiftLayoutForWideGate(
      layout,
      newGateX,
      newGateWidth,
      gridWidth,
      targetGateId = null
    ) {
      // Only shift for CG gate in X-Ray mode
      if (!targetGateId || xRayGateId !== targetGateId) {
        return layout; // Allow collisions unless CG is expanded
      }

      const newColumns = new Set();
      for (let i = newGateX; i < newGateX + newGateWidth; i++) {
        newColumns.add(i);
      }

      let shiftedLayout = [...layout];
      let shiftRequired = true;

      // Iteratively shift to handle cascading conflicts
      while (shiftRequired) {
        shiftRequired = false;
        shiftedLayout = shiftedLayout.map((item) => {
          // Ignore placeholder and CG gate in X-Ray mode
          if (item.i === "__dropping-elem__" || item.i === targetGateId)
            return item;

          // Check if it overlaps CG gate's columns
          const itemColumns = new Set();
          for (let i = item.x; i < item.x + item.w; i++) {
            itemColumns.add(i);
          }

          const overlap = [...newColumns].some((c) => itemColumns.has(c));

          if (overlap) {
            shiftRequired = true;
            // Try shifting right
            let tryRight = item.x + newGateWidth;
            if (tryRight + item.w <= gridWidth) {
              return { ...item, x: tryRight };
            }
            // Try shifting left
            let tryLeft = item.x - newGateWidth;
            if (tryLeft >= 0) {
              return { ...item, x: tryLeft };
            }
            // No valid position
            console.warn(
              `Cannot shift gate ${item.i}: no valid position available.`
            );
            return item; // Keep original position (may cause overlap)
          }
          return item;
        });
      }

      return shiftedLayout;
    }

   
    const onDrop = (newLayout, layoutItem, event) => {
      event.preventDefault();
      let gateId = event.dataTransfer.getData("gateId");
      const operator = operators.find((op) => op.id === gateId);
      if (!operator) return;

      const height = operator.height || 1;
      const width = operator.width || 1; 

      const x = layoutItem.x;
      const y = layoutItem.y;

      // Prevent placing outside grid
      if (x + width > gridDimenX || y + height > gridDimenY) {
        console.warn("Cannot place gate: outside grid boundaries.");
        return;
      }

      // Check for conflicts with CG gate in X-Ray mode
      let finalX = x;
      const xRayItem = xRayGateId
        ? layout.find((item) => item.i === xRayGateId)
        : null;
      if (xRayItem) {
        const xRayGate = operators.find((op) => op.id === xRayItem.gateId);
        if (xRayGate?.components?.length) {
          const minX = Math.min(...xRayGate.components.map((c) => c.x));
          const maxX = Math.max(...xRayGate.components.map((c) => c.x));
          const xRayWidth = maxX - minX + 1;
          const xRayColumns = new Set();
          for (let i = xRayItem.x; i < xRayItem.x + xRayWidth; i++) {
            xRayColumns.add(i);
          }
          const newColumns = new Set();
          for (let i = x; i < x + width; i++) {
            newColumns.add(i);
          }
          if ([...newColumns].some((c) => xRayColumns.has(c))) {
            // Try to place right of CG gate
            const tryRight = xRayItem.x + xRayWidth;
            if (tryRight + width <= gridDimenX) {
              finalX = tryRight;
            } else {
              // Try left of CG gate
              const tryLeft = xRayItem.x - width;
              if (tryLeft >= 0) {
                finalX = tryLeft;
              } else {
                console.warn(
                  "Cannot place gate: conflicts with CG gate in X-Ray mode and no valid position."
                );
                return;
              }
            }
          }
        }
      }

      // Add new gate (no shifting unless CG is expanded)
      const newItem = {
        i: new Date().getTime().toString(),
        gateId,
        x: finalX,
        y,
        w: width,
        h: height,
        isResizable: false,
      };
      const updatedLayout = [...layout, newItem];
      handleCircuitChange({ layout: updatedLayout });
    };

    function mergeLayoutWithGateIds(newLayout, oldLayout) {
      return newLayout.map((item) => {
        const existing = oldLayout.find((i) => i.i === item.i);
        return {
          ...item,
          gateId: existing?.gateId,
        };
      });
    }

    // CHANGE 4: Enhance handleDragStop to handle edge cases
    const handleDragStop = (newLayout) => {
      if (!draggedItemId) return;

      // Merge back gateIds
      const mergedLayout = mergeLayoutWithGateIds(newLayout, layout);

      // Find the moved gate
      const movedItem = mergedLayout.find((item) => item.i === draggedItemId);
      if (!movedItem) return;

      const gate = operators.find((op) => op.id === movedItem.gateId);
      const isXRayMode = xRayGateId === movedItem.i && gate?.components?.length;
      const movedWidth = isXRayMode
        ? Math.max(...gate.components.map((c) => c.x)) -
          Math.min(...gate.components.map((c) => c.x)) +
          1
        : gate?.width || 1; // Use default width unless in X-Ray mode
      let movedX = movedItem.x;

      // Prevent dragging outside grid
      if (movedX < 0) {
        console.warn("Cannot move gate: exceeds left grid boundary.");
        movedX = 0;
      }
      if (movedX + movedWidth > gridDimenX) {
        console.warn("Cannot move gate: exceeds right grid boundary.");
        movedX = gridDimenX - movedWidth;
      }

      // Check for conflicts with CG gate in X-Ray mode (if not dragging the CG gate)
      const xRayItem =
        xRayGateId && xRayGateId !== movedItem.i
          ? layout.find((item) => item.i === xRayGateId)
          : null;
      if (xRayItem) {
        const xRayGate = operators.find((op) => op.id === xRayItem.gateId);
        if (xRayGate?.components?.length) {
          const minX = Math.min(...xRayGate.components.map((c) => c.x));
          const maxX = Math.max(...xRayGate.components.map((c) => c.x));
          const xRayWidth = maxX - minX + 1;
          const xRayColumns = new Set();
          for (let i = xRayItem.x; i < xRayItem.x + xRayWidth; i++) {
            xRayColumns.add(i);
          }
          const movedColumns = new Set();
          for (let i = movedX; i < movedX + movedWidth; i++) {
            movedColumns.add(i);
          }
          if ([...movedColumns].some((c) => xRayColumns.has(c))) {
            // Try to place right of CG gate
            const tryRight = xRayItem.x + xRayWidth;
            if (tryRight + movedWidth <= gridDimenX) {
              movedX = tryRight;
            } else {
              // Try left of CG gate
              const tryLeft = xRayItem.x - movedWidth;
              if (tryLeft >= 0) {
                movedX = tryLeft;
              } else {
                console.warn(
                  "Cannot move gate: conflicts with CG gate in X-Ray mode and no valid position."
                );
                return;
              }
            }
          }
        }
      }

      // Update layout without shifting (allow collisions unless CG is expanded)
      const updatedLayout = [
        ...mergedLayout.filter((item) => item.i !== movedItem.i),
        { ...movedItem, x: movedX, w: movedWidth },
      ];

      setLayout(updatedLayout);
      setDraggedItemId(null);
    };

    return (
      <div
        className="relative bg-white border-2 border-gray-200 m-2 shadow-lg rounded-lg"
        style={{
          boxSizing: "content-box",
          padding: `${circuitContainerPadding.y}px ${circuitContainerPadding.x}px`,
          minWidth: `${
            2 * containerPadding.x + gridDimenX * (size + margin.x)
          }px`,
          width: `${
            2 * containerPadding.x +
            gridDimenX * (size + margin.x) +
            size / 2 +
            margin.x
          }px`,
          height: `${
            2 * containerPadding.y + gridDimenY * (size + margin.y) - margin.y
          }px`,
          overflow: "hidden",
        }}
      >
        <ReactGridLayout
          allowOverlap={false}
          layout={layout}
          useCSSTransforms={false}
          className="relative z-20"
          cols={gridDimenX}
          compactType={null}
          containerPadding={[containerPadding.x, containerPadding.y]}
          droppingItem={{
            i: "__dropping-elem__",
            h: droppingItemHeight,
            w: droppingItemWidth,
          }}
          isBounded={false}
          isDroppable={true}
          margin={[margin.x, margin.y]}
          onDrag={() => {
            const placeholderEl = document.querySelector(
              ".react-grid-placeholder"
            );
            if (placeholderEl) {
              placeholderEl.style.backgroundColor = "rgba(235, 53, 53, 0.2)";
              placeholderEl.style.border = "2px dashed blue";
            }
          }}
          onDragStart={(layout, oldItem) => {
            const draggedItemId = oldItem?.i;
            if (!draggedItemId) return;
            setDraggedItemId(draggedItemId);
          }}
          onDragStop={(layout, oldItem, newItem) => {
            handleDragStop(layout);
          }}
          onDrop={onDrop}
          preventCollision={true}
          rowHeight={size}
          style={{
            minHeight: `${
              2 * containerPadding.y + gridDimenY * (size + margin.y) - margin.y
            }px`,
            maxHeight: `${
              2 * containerPadding.y + gridDimenY * (size + margin.y) - margin.y
            }px`,
            overflowY: "visible",
            marginLeft: `${circuitLineMarginL}px`,
            marginRight: `${circuitLineMarginR}px`,
          }}
          width={gridDimenX * (size + margin.x)}
        >
          {layout?.map((item) => {
            const gate = operators.find((op) => op.id === item.gateId);
            if (!gate) return null;
            return (
              <div
                className="grid-item relative group"
                data-grid={item}
                key={`${item.i}`}
              >
                <Operator
                  itemId={item.i}
                  symbol={gate.icon}
                  height={gate.height}
                  width={gate.width}
                  fill={gate.fill}
                  isCustom={gate.isCustom}
                  components={gate.components ?? []}
                  xRayGateId={xRayGateId}
                  setXRayGateId={setXRayGateId}
                />
              </div>
            );
          })}
        </ReactGridLayout>

        <div
          className="absolute top-0 left-0 z-10"
          style={{
            width: `${
              2 * containerPadding.x + gridDimenX * (size + margin.x) + size / 2
            }px`,
          }}
        >
          {[...new Array(gridDimenY)].map((_, index) => (
            <div
              className={"absolute flex group"}
              key={index}
              style={{
                height: `${size}px`,
                width: "100%",
                top: `${
                  circuitContainerPadding.y +
                  containerPadding.y +
                  index * size +
                  size / 2 +
                  index * margin.y
                }px`,
                paddingLeft: `${circuitLineMarginL}px`,
              }}
            >
              <div className="absolute top-0 -translate-y-1/2 left-2 font-mono">
                Q<sub>{index}</sub>
              </div>
              <div
                className="h-[1px] bg-gray-400 grow"
                data-line={index}
                data-val={index + 1}
                key={`line-${index}`}
              ></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
