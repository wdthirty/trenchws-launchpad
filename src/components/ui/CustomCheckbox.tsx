import React from 'react';
import { cn } from '@/lib/utils';
import { appThemes } from '@/components/TokenHeader/themes';

export type CustomCheckboxTheme = keyof typeof appThemes | 'ghost';

export interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  theme?: CustomCheckboxTheme;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  theme = 'ghost',
  children,
  className,
  disabled = false,
}) => {
  const getThemeClasses = (themeName: CustomCheckboxTheme, isChecked: boolean) => {
    if (themeName === 'ghost') {
      return isChecked 
        ? 'bg-white/[7%] text-white border-white/50' 
        : 'bg-[#0B0F13]/50 text-white border-slate-600/30 hover:bg-white/[7%] hover:border-white/50';
    }
    
    const theme = appThemes[themeName as keyof typeof appThemes];
    return isChecked 
      ? cn(
          'bg-transparent',
          theme.text,
          theme.borderHover,
          theme.backgroundHover
        )
      : cn(
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
    'flex items-center justify-center gap-2 border rounded-full transition-all duration-200 active:scale-95 shadow-lg backdrop-blur-sm font-medium px-4 py-2 text-sm cursor-pointer',
    getThemeClasses(theme, checked),
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  return (
    <button
      type="button"
      className={baseClasses}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      {checked && (
        <svg 
          className="w-4 h-4 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 13l4 4L19 7" 
          />
        </svg>
      )}
      <span className="hover:scale-105 transition-all duration-200">
        {children}
      </span>
    </button>
  );
};

export default CustomCheckbox;
