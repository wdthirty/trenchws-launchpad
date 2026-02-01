import React from 'react';
import { IconProps } from './types';

const EmailIcon: React.FC<IconProps> = ({ width = 12, height = 12, fill="#dedede", ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      stroke="none"
      fill={fill}
      width={width}
      height={height}
      {...props}
    >
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  );
};

export default EmailIcon;
