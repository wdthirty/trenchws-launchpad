import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Close from '@mui/icons-material/Close';
import React from 'react';
import type { TextFieldProps } from '@mui/material/TextField';

// TextField-specific themes with proper color values
const textFieldThemes = {
  slate: {
    border: 'rgba(55, 65, 81, 0.3)',
    borderHover: 'rgba(148, 163, 184, 0.5)',
    borderFocus: 'rgba(148, 163, 184, 0.7)',
    text: '#E5E7EB',
    textHover: '#F3F4F6',
    textFocus: '#FFFFFF'
  },
  purple: {
    border: 'rgba(139, 92, 246, 0.3)',
    borderHover: 'rgba(167, 139, 250, 0.5)',
    borderFocus: 'rgba(167, 139, 250, 0.7)',
    text: '#E5E7EB',
    textHover: '#F3F4F6',
    textFocus: '#FFFFFF'
  },
  blue: {
    border: 'rgba(59, 130, 246, 0.3)',
    borderHover: 'rgba(96, 165, 250, 0.5)',
    borderFocus: 'rgba(96, 165, 250, 0.7)',
    text: '#E5E7EB',
    textHover: '#F3F4F6',
    textFocus: '#FFFFFF'
  },
  green: {
    border: 'rgba(16, 185, 129, 0.3)',
    borderHover: 'rgba(52, 211, 153, 0.5)',
    borderFocus: 'rgba(52, 211, 153, 0.7)',
    text: '#E5E7EB',
    textHover: '#F3F4F6',
    textFocus: '#FFFFFF'
  },
  yellow: {
    border: 'rgba(245, 158, 11, 0.3)',
    borderHover: 'rgba(251, 191, 36, 0.5)',
    borderFocus: 'rgba(251, 191, 36, 0.7)',
    text: '#E5E7EB',
    textHover: '#F3F4F6',
    textFocus: '#FFFFFF'
  },
  red: {
    border: 'rgba(239, 68, 68, 0.3)',
    borderHover: 'rgba(248, 113, 113, 0.5)',
    borderFocus: 'rgba(248, 113, 113, 0.7)',
    text: '#E5E7EB',
    textHover: '#F3F4F6',
    textFocus: '#FFFFFF'
  },
  cyan: {
    border: 'rgba(6, 182, 212, 0.3)',
    borderHover: 'rgba(34, 211, 238, 0.5)',
    borderFocus: 'rgba(34, 211, 238, 0.7)',
    text: '#E5E7EB',
    textHover: '#F3F4F6',
    textFocus: '#FFFFFF'
  }
};

interface CustomTextFieldProps extends Omit<TextFieldProps, 'sx'> {
  theme?: keyof typeof textFieldThemes;
  onClear?: () => void;
}

export const CustomTextField: React.FC<CustomTextFieldProps> = ({ theme = 'slate', value, onClear, ...props }) => {
  const selectedTheme = textFieldThemes[theme];
  const hasValue = value && value.toString().trim().length > 0;
  
  return (
    <TextField
      {...props}
      value={value}
      fullWidth
      variant="outlined"
      size="small"
      slotProps={{
        input: {
          endAdornment: hasValue && onClear ? (
            <IconButton
              size="small"
              onClick={onClear}
              tabIndex={-1}
              sx={{
                width: 20,
                height: 20,
                color: selectedTheme.text,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                '&:hover': {
                  color: selectedTheme.textHover,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              <Close sx={{ fontSize: 16, color: selectedTheme.text }} />
            </IconButton>
          ) : undefined,
        }
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: hasValue ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
          color: selectedTheme.text,
          transition: 'color 0.2s ease-in-out, background-color 0.2s ease-in-out',
          borderRadius: '6px',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: selectedTheme.border,
            transition: 'border-color 0.2s ease-in-out',
            borderRadius: '6px',
          },
          '&:hover': {
            color: selectedTheme.textHover,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: selectedTheme.borderHover,
            },
          },
          '&.Mui-focused': {
            color: selectedTheme.textFocus,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: selectedTheme.borderFocus,
            },
          },
        },
        '& .MuiInputLabel-root': {
          color: '#9CA3AF',
        },
        '& .MuiInputBase-input::placeholder': {
          color: '#9CA3AF',
          opacity: 1,
        },
      }}
    />
  );
};
