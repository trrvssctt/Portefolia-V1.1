import React from 'react';

interface HeatmapCell {
  page?: string;
  gx: number;
  gy: number;
  count: number;
}

interface HeatmapGridProps {
  data?: HeatmapCell[];
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({ data = [] }) => {
  // Build aggregated 10x10 grid (counts summed across pages)
  const grid = Array.from({ length: 100 }, (_, i) => ({ index: i, count: 0 }));
  for (const cell of data) {
    const idx = (cell.gy * 10) + cell.gx;
    if (grid[idx]) grid[idx].count += cell.count;
  }
  const max = Math.max(...grid.map(g => g.count), 1);

  return (
    <div className="p-4 bg-white/5 rounded-lg">
      <div className="grid grid-cols-10 gap-1">
        {grid.map(g => (
          <div
            key={g.index}
            className="w-6 h-6 rounded"
            title={`count: ${g.count}`}
            style={{ backgroundColor: `rgba(220, 38, 38, ${g.count / max})` }}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-gray-300">Heatmap agrégée</p>
    </div>
  );
};

export default HeatmapGrid;
