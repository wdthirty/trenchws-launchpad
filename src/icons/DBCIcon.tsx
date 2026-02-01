import React from 'react';
import { IconProps } from './types';

export const DBCIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Background circle with gradient */}
      <circle cx="150" cy="150" r="150" fill="url(#gradient)" />
      
      {/* DBC Text - Simplified and more reliable */}
      <text
        x="150"
        y="180"
        textAnchor="middle"
        fill="white"
        fontSize="120"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        DBC
      </text>
      
      {/* Alternative: Vector paths for DBC if text doesn't work */}
      <g fill="white">
        {/* Letter D */}
        <path d="M80 80 L80 220 L140 220 Q180 220 180 180 L180 120 Q180 80 140 80 L80 80 Z M100 100 L140 100 Q160 100 160 120 L160 180 Q160 200 140 200 L100 200 L100 100 Z" />
        
        {/* Letter B */}
        <path d="M200 80 L200 220 L260 220 Q300 220 300 180 L300 150 Q300 130 280 120 Q300 110 300 90 L300 80 L200 80 Z M220 100 L260 100 Q280 100 280 120 L280 150 Q280 170 260 170 L220 170 L220 100 Z M220 180 L260 180 Q280 180 280 200 L280 220 L220 220 L220 180 Z" />
        
        {/* Letter C */}
        <path d="M320 80 L320 220 L380 220 Q420 220 420 180 L420 120 Q420 80 380 80 L320 80 Z M340 100 L380 100 Q400 100 400 120 L400 180 Q400 200 380 200 L340 200 L340 100 Z" />
      </g>
      
      <defs>
        <linearGradient
          id="gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#F7C10B" />
          <stop offset="50%" stopColor="#F84C00" />
          <stop offset="100%" stopColor="#5F33FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};
