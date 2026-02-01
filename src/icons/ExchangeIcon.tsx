import React from 'react';

interface ExchangeIconProps {
  className?: string;
  width?: number;
  height?: number;
}

const ExchangeIcon: React.FC<ExchangeIconProps> = ({ 
  className = '', 
  width = 16, 
  height = 16 
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transform: 'rotate(90deg)' }}
    >
      <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
};

export default ExchangeIcon;
