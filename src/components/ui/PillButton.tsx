import React from 'react';
import { cn } from '@/lib/utils';
import { appThemes } from '@/components/TokenHeader/themes';

export type PillButtonTheme = keyof typeof appThemes | 'ghost';

export type PillButtonSize = 'sm' | 'md' | 'lg';

export interface PillButtonProps {
  theme?: PillButtonTheme;
  size?: PillButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  href?: string;
  as?: 'button' | 'a';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-3'
};

export const PillButton: React.FC<PillButtonProps> = ({
  theme = 'ghost',
  size = 'md',
  icon,
  children,
  className,
  href,
  as = 'button',
  onClick,
  disabled,
  type = 'button',
  ...props
}) => {
  const getThemeClasses = (themeName: PillButtonTheme) => {
    if (themeName === 'ghost') {
      return 'bg-[#0B0F13]/80 text-white border-slate-600/30 hover:bg-white/[7%] hover:border-white/50';
    }
    
    const theme = appThemes[themeName as keyof typeof appThemes];
    return cn(
      'bg-transparent border-slate-600/30',
      theme.text,
      theme.hover,
      theme.border,
      theme.borderHover,
      theme.background,
      theme.backgroundHover
    );
  };

  const baseClasses = cn(
    'flex items-center justify-center gap-2 border rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium group cursor-pointer',
    getThemeClasses(theme),
    sizeStyles[size],
    className
  );

  if (as === 'a' && href) {
    return (
      <a href={href} className={baseClasses}>
        {icon && <span className={`iconify transition-all duration-200 ${icon}`} />}
        {children}
      </a>
    );
  }

  return (
    <button 
      className={baseClasses} 
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {icon && <span className={`iconify transition-all duration-200 ${icon}`} />}
      {children}
    </button>
  );
};

export default PillButton;
