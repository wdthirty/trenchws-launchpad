import React, { useEffect, useState } from 'react';
import { ApeClient } from '../Explore/client';
import { ChartInterval } from '../Explore/types';

interface MiniChartProps {
  assetId: string;
  className?: string;
}

interface ChartData {
  time: number;
  close: number;
}

export const MiniChart: React.FC<MiniChartProps> = React.memo(({ 
  assetId, 
  className = ""
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setIsLoading(true);
        setError(false);
        
        // Get data for the last 24 hours with 1-hour intervals
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        const response = await ApeClient.getChart(assetId, {
          interval: ChartInterval.ONE_HOUR,
          baseAsset: assetId,
          from: oneDayAgo,
          to: now,
          candles: 24,
          type: 'price'
        });

        if (response.candles && response.candles.length > 0) {
          // Extract time and close price data
          const data = response.candles.map(candle => ({
            time: candle.time,
            close: candle.close
          }));
          setChartData(data);
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (assetId) {
      fetchChartData();
    }
  }, [assetId]);

  if (isLoading) {
    return (
      <div 
        className={`bg-slate-800/30 rounded animate-pulse ${className}`}
        style={{ height: 50 }}
      />
    );
  }

  if (error || chartData.length === 0) {
    return (
      <div 
        className={`bg-slate-800/30 rounded flex items-center justify-center ${className}`}
        style={{ height: 50 }}
      >
        <div className="text-slate-500 text-xs">—</div>
      </div>
    );
  }

  // Ensure we have at least 2 data points for a meaningful trendline
  if (chartData.length < 2) {
    return (
      <div 
        className={`bg-slate-800/30 rounded flex items-center justify-center ${className}`}
        style={{ height: 50 }}
      >
        <div className="text-slate-500 text-xs">—</div>
      </div>
    );
  }

  // Calculate chart dimensions and scaling
  const padding = 8;
  const chartWidth = 100 - (padding * 2); // Use percentage for responsive width
  const chartHeight = 50 - (padding * 2);

  // Find min/max values for scaling
  const prices = chartData.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // If all prices are the same, create a small range
  const adjustedPriceRange = priceRange === 0 ? Math.max(minPrice * 0.01, 0.000001) : priceRange;

  // Scale data to fit chart
  const scaledData = chartData.map((point, index) => {
    const x = padding + (index / (chartData.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.close - minPrice) / adjustedPriceRange) * chartHeight;
    return { x, y };
  });

  // Create SVG path for the trendline
  const pathData = scaledData.length > 1 
    ? scaledData.map((point, index) => 
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      ).join(' ')
    : '';

  // Determine color based on price trend
  const firstPrice = chartData[0]?.close || 0;
  const lastPrice = chartData[chartData.length - 1]?.close || 0;
  const isPositive = lastPrice >= firstPrice;
  const strokeColor = isPositive ? '#2cff7a' : '#ff5050'; // emerald.DEFAULT for positive, rose.DEFAULT for negative
  
  // Calculate percentage change
  const percentageChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return (
    <div className={`w-full relative ${className}`} style={{ height: 50 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Background with subtle gradient */}
        <defs>
          <linearGradient id={`chart-bg-${assetId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#111827" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        <rect
          width="100"
          height="50"
          fill={`url(#chart-bg-${assetId})`}
          rx="4"
        />
        
        {/* Grid lines (subtle) */}
        <line
          x1={padding}
          y1={25}
          x2={100 - padding}
          y2={25}
          stroke="#374151"
          strokeWidth="0.5"
          opacity="0.2"
        />
        
        {/* Additional subtle grid lines */}
        <line
          x1={padding}
          y1={12.5}
          x2={100 - padding}
          y2={12.5}
          stroke="#374151"
          strokeWidth="0.3"
          opacity="0.1"
        />
        <line
          x1={padding}
          y1={37.5}
          x2={100 - padding}
          y2={37.5}
          stroke="#374151"
          strokeWidth="0.3"
          opacity="0.1"
        />
        
        {/* Trendline */}
        {pathData && (
          <path
            d={pathData}
            stroke={strokeColor}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Price change indicator dot */}
        {scaledData.length > 0 && (
          <circle
            cx={scaledData[scaledData.length - 1].x}
            cy={scaledData[scaledData.length - 1].y}
            r="2"
            fill={strokeColor}
          />
        )}
      </svg>
      
      {/* Percentage change indicator as HTML span for better responsiveness */}
      <div className="absolute top-1 right-0.5">
        <span 
          className="text-xs font-medium px-0.5 py-0.5 rounded bg-[#0B0F13]/60 backdrop-blur-sm"
          style={{ color: strokeColor }}
        >
          {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
        </span>
      </div>
    </div>
  );
});

MiniChart.displayName = 'MiniChart';
