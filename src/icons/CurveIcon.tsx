import React from 'react';
import { IconProps } from './types';

const CurveIcon: React.FC<IconProps> = ({ width = 12, height = 12, ...props }) => {
  return (
<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" width={width} height={height} fill="#FDE047"><path d="M21,2H3A1,1,0,0,0,2,3V21a1,1,0,0,0,1,1H21a1,1,0,0,0,1-1V3A1,1,0,0,0,21,2ZM17,7c-2.542,0-4,1.822-4,5,0,4.252-2.355,7-6,7a1,1,0,0,1,0-2c2.542,0,4-1.822,4-5,0-4.318,2.3-7,6-7A1,1,0,0,1,17,7Z"/></svg>  );
};

export default CurveIcon;
