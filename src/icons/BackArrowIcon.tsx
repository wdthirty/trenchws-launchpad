import React, { SVGProps } from 'react';

const BackArrowIcon: React.FC<SVGProps<SVGSVGElement>> = ({
  width = 16,
  height = 16,
  ...otherProps
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...otherProps}
    >
      <path
        d="M10.5 3.5L5.5 8.5L10.5 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BackArrowIcon;
