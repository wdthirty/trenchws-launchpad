import React from 'react';
import { IconProps } from './types';

const ShortcutIcon: React.FC<IconProps> = ({ width = 12, height = 12, ...props }) => {
  return (
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="12px" height="12px" fill-rule="nonzero"><g fill="#FDE047" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none"><g transform="scale(10.66667,10.66667)"><path d="M6,3v2h11.59375l-13.84375,13.84375l1.40625,1.40625l13.84375,-13.84375v11.59375h2v-15z"></path></g></g></svg>  );
};

export default ShortcutIcon;
