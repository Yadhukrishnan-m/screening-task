import ReactGridLayout from 'react-grid-layout';
import React, { useEffect } from 'react';
import Operator from './Operator';
import { margin, operators, size } from '../data/operators';

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
const gridDimenY = 3; // Number of rows in the grid (qubits)
const gridDimenX = 10; // Number of columns in the grid

export default function CircuitCanvas({ droppingItem }) {
    const [layout, setLayout] = React.useState([]);
    const [droppingItemHeight, setDroppingItemHeight] = React.useState(1);
    const [draggedItemId, setDraggedItemId] = React.useState(null);

    useEffect(() => {
        if (!droppingItem) return;
        const op = operators.find(op => op.id === droppingItem);
        setDroppingItemHeight(op?.height ?? 1);
    }, [droppingItem]);

    //  Dynamically calculate width of dropping item
    const droppingItemWidth = React.useMemo(() => {
        if (!droppingItem) return 1;
        const op = operators.find(op => op.id === droppingItem);
        if (!op) return 1;
        if (op.components?.length > 0) {
            const minX = Math.min(...op.components.map(c => c.x));
            const maxX = Math.max(...op.components.map(c => c.x));
            return maxX - minX + 1;
        }
        return 1;
    }, [droppingItem]);

    const handleCircuitChange = (newCircuit) => {
        setLayout(newCircuit.layout);
    };

    const onDrop = (newLayout, layoutItem, event) => {
      event.preventDefault();

      let gateId = event.dataTransfer.getData("gateId");
      const operator = operators.find((op) => op.id === gateId);
      if (!operator) return;

      const height = operator.height || 1;
      const width = (() => {
        if (operator.components?.length) {
          const minX = Math.min(...operator.components.map((c) => c.x));
          const maxX = Math.max(...operator.components.map((c) => c.x));
          return maxX - minX + 1;
        }
        return 1;
      })();

      const x = layoutItem.x;
      const y = layoutItem.y;

      //  Prevent placing outside grid width
      if (x + width > gridDimenX || y + height > gridDimenY) return;

      // Calculate occupied cells for the new gate
      const newCells = [];
      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
          newCells.push(`${x + dx}-${y + dy}`);
        }
      }

      //  Check for overlap with existing items
      const existingCells = new Set();
      layout.forEach((item) => {
        const w = item.w || 1;
        const h = item.h || 1;
        for (let dx = 0; dx < w; dx++) {
          for (let dy = 0; dy < h; dy++) {
            existingCells.add(`${item.x + dx}-${item.y + dy}`);
          }
        }
      });

      const hasOverlap = newCells.some((cell) => existingCells.has(cell));
      if (hasOverlap) return; // Cancel drop if overlap

      const newItem = {
        i: new Date().getTime().toString(),
        gateId,
        x,
        y,
        w: width,
        h: height,
        isResizable: false,
      };

      const updatedLayout = newLayout
        .filter((item) => item.i !== "__dropping-elem__" && item.y < gridDimenY)
        .map((item) => ({
          ...item,
          gateId: layout.find((i) => i.i === item.i)?.gateId,
        }));

      updatedLayout.push(newItem);
      handleCircuitChange({ layout: updatedLayout });
    };
    const handleDragStop = (newLayout) => {
        if (!draggedItemId) return;
        const updatedLayout = newLayout.filter(
            item => item.i !== '__dropping-elem__' && item.y < gridDimenY
        ).map(item => ({
            ...item,
            gateId: layout.find(i => i.i === item.i)?.gateId,
        }));

        setLayout(updatedLayout);
        setDraggedItemId(null);
    };

    return (
        <div className='relative bg-white border-2 border-gray-200 m-2 shadow-lg rounded-lg'
            style={{
                boxSizing: 'content-box',
                padding: `${circuitContainerPadding.y}px ${circuitContainerPadding.x}px`,
                minWidth: `${2 * containerPadding.x + gridDimenX * (size + margin.x)}px`,
                width: `${2 * containerPadding.x + (gridDimenX) * (size + margin.x) + size / 2 + margin.x}px`,
                height: `${2 * containerPadding.y + (gridDimenY) * (size + margin.y) - margin.y}px`,
                overflow: 'hidden',
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
                    i: '__dropping-elem__',
                    h: droppingItemHeight,
                    w: droppingItemWidth, // ✅ Use dynamic width
                }}
                isBounded={false}
                isDroppable={true}
                margin={[margin.x, margin.y]}
                onDrag={() => {
                    const placeholderEl = document.querySelector('.react-grid-placeholder');
                    if (placeholderEl) {
                        placeholderEl.style.backgroundColor = 'rgba(235, 53, 53, 0.2)';
                        placeholderEl.style.border = '2px dashed blue';
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
                    minHeight: `${2 * containerPadding.y + gridDimenY * (size + margin.y) - margin.y}px`,
                    maxHeight: `${2 * containerPadding.y + gridDimenY * (size + margin.y) - margin.y}px`,
                    overflowY: 'visible',
                    marginLeft: `${circuitLineMarginL}px`,
                    marginRight: `${circuitLineMarginR}px`,
                }}
                width={gridDimenX * (size + margin.x)}
            >
                {layout?.map((item) => {
                    const gate = operators.find(op => op.id === item.gateId);
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
                            />
                        </div>
                    );
                })}
            </ReactGridLayout>

            <div className="absolute top-0 left-0 z-10"
                style={{
                    width: `${2 * containerPadding.x + (gridDimenX) * (size + margin.x) + size / 2}px`,
                }}>
                {[...new Array(gridDimenY)].map((_, index) => (
                    <div
                        className={'absolute flex group'}
                        key={index}
                        style={{
                            height: `${size}px`,
                            width: '100%',
                            top: `${circuitContainerPadding.y + containerPadding.y + index * size + size / 2 + index * margin.y}px`,
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
