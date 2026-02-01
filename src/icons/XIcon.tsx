import React from 'react';
import { IconProps } from './types';

const XIcon: React.FC<IconProps> = ({ width = 12, height = 12, fill="#dedede", className, ...props }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0,0,256,256" 
      width="14px" 
      height="14px"
      className={className}
      {...props}
    >
      <g fill={fill} stroke="none">
        <g transform="scale(10.66667,10.66667)">
          <path d="M2.36719,3l7.0957,10.14063l-6.72266,7.85938h2.64063l5.26367,-6.16992l4.31641,6.16992h6.91016l-7.42187,-10.625l6.29102,-7.375h-2.59961l-4.86914,5.6875l-3.97266,-5.6875zM6.20703,5h2.04883l9.77734,14h-2.03125z"></path>
        </g>
      </g>
    </svg>
  );
};

export default XIcon;
