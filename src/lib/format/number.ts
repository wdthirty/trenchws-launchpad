export const DASH = '-';

const COMPACT_THRESHOLD = 1000;
const LONG_THRESHOLD = 10;
const SMALL_DECIMALS = 5;

export function getReadablePriceFormat(price?: number | null): ReadableNumberFormat {
  if (price === undefined || price === null) {
    return ReadableNumberFormat.SMALL;
  }
  if (price >= 100_000) {
    return ReadableNumberFormat.COMPACT;
  }
  if (price > LONG_THRESHOLD) {
    return ReadableNumberFormat.LONG;
  }
  return ReadableNumberFormat.SMALL;
}

// Lazily memoize formatters for each decimal precision
const intlNumberSmallFormatters: Record<number, Intl.NumberFormat> = {};
function getNumberSmallFormatter(decimals: number): Intl.NumberFormat {
  if (intlNumberSmallFormatters[decimals]) {
    return intlNumberSmallFormatters[decimals];
  }

  const formatter = new Intl.NumberFormat(undefined, {
    minimumSignificantDigits: 3,
    maximumSignificantDigits: decimals,
    maximumFractionDigits: decimals,
    // roundingMode: 'trunc', // Removed as it's not supported in all TypeScript versions
  });
  intlNumberSmallFormatters[decimals] = formatter;
  return formatter;
}

const intlNumberCompact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  compactDisplay: 'short',
  minimumSignificantDigits: 3,
  maximumSignificantDigits: 3,
});

const intlNumberLong = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intlNumberSmall = getNumberSmallFormatter(SMALL_DECIMALS);

const intlIntegerCompact = new Intl.NumberFormat(undefined, {
  ...intlNumberCompact.resolvedOptions(),
  minimumSignificantDigits: 1,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const intlIntegerLong = new Intl.NumberFormat(undefined, {
  ...intlNumberLong.resolvedOptions(),
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const intlIntegerSmall = new Intl.NumberFormat(undefined, {
  ...intlNumberSmall.resolvedOptions(),
  minimumSignificantDigits: 1,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const intlPctChange = new Intl.NumberFormat(undefined, {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const intlPctChangeOneDec = new Intl.NumberFormat(undefined, {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const intlPctChangeZeroDec = new Intl.NumberFormat(undefined, {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const intlPctChangeNoSign = new Intl.NumberFormat(undefined, {
  style: 'percent',
  signDisplay: 'never',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const intlPctChangeNoSignOneDec = new Intl.NumberFormat(undefined, {
  style: 'percent',
  signDisplay: 'never',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const intlPctChangeNoSignZeroDec = new Intl.NumberFormat(undefined, {
  style: 'percent',
  signDisplay: 'never',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const ReadableNumberFormat = {
  COMPACT: 'compact',
  LONG: 'long',
  SMALL: 'small',
} as const;
export type ReadableNumberFormat = (typeof ReadableNumberFormat)[keyof typeof ReadableNumberFormat];

type FormatReadableNumberOptions = {
  prefix?: string;
  suffix?: string;
  integer?: boolean;
  /**
   * Decimal precision to show for small numbers
   *
   * @default 5
   */
  decimals?: number;
  /**
   * Whether to show zeros in subscript form
   *
   * @default true
   */
  subscript?: boolean;
  format?: ReadableNumberFormat;
};

function getReadableNumberFormatter(
  value: number,
  options: FormatReadableNumberOptions
): Intl.NumberFormat {
  if (
    (!options.format && value > COMPACT_THRESHOLD) ||
    options.format === ReadableNumberFormat.COMPACT
  ) {
    return options.integer ? intlIntegerCompact : intlNumberCompact;
  }
  if ((!options.format && value > LONG_THRESHOLD) || options.format === ReadableNumberFormat.LONG) {
    return options.integer ? intlIntegerLong : intlNumberLong;
  }

  if (options.integer) {
    return intlIntegerSmall;
  }
  const decimals = options.decimals ?? SMALL_DECIMALS;
  return getNumberSmallFormatter(decimals);
}

/**
 * Formats a number in a human-readable form
 */
export function formatReadableNumber(
  num?: number | null,
  options: FormatReadableNumberOptions = {}
): string {
  if (num === null || num === undefined || isNaN(num)) {
    return DASH;
  }

  const abs = Math.abs(num);
  let formatted = getReadableNumberFormatter(abs, options).format(num);

  if (abs < 0.01 && abs !== 0 && options.subscript !== false) {
    const zeroes = countInsignificantFractionalZeroes(abs);
    const prefix = formatted.slice(0, num < 0 ? 4 : 3);
    const suffix = formatted.slice((num < 0 ? 3 : 2) + zeroes);
    formatted = `${prefix}${zeroes > 0 ? formatSubscript(zeroes) : ''}${suffix}`;
  }

  // Apply prefix before negative sign
  if (options.prefix) {
    if (num < 0 && formatted[0] === '-') {
      formatted = options.prefix + formatted.slice(1);
      formatted = '-' + formatted;
    } else {
      formatted = options.prefix + formatted;
    }
  }
  if (options.suffix) {
    formatted = formatted + options.suffix;
  }

  return formatted;
}

/**
 * Formats a percentage change in a human-readable form
 *
 * For example, 0.1 = +10%
 *              10 = +10x
 */
export function formatReadablePercentChange(
  num?: number | null,
  options: { hideSign?: 'all' | 'positive'; decimals?: 0 | 1 | 2 } = {}
): string {
  if (num === null || num === undefined || isNaN(num)) {
    return DASH;
  }
  if (num < 10) {
    if (options.hideSign === 'all' || (options.hideSign === 'positive' && num >= 0)) {
      const formatter =
        options.decimals === 0
          ? intlPctChangeNoSignZeroDec
          : options.decimals === 1
            ? intlPctChangeNoSignOneDec
            : intlPctChangeNoSign;
      return formatter.format(num);
    }
    const formatter =
      options.decimals === 0
        ? intlPctChangeZeroDec
        : options.decimals === 1
          ? intlPctChangeOneDec
          : intlPctChange;
    return formatter.format(num);
  }
  return (!options.hideSign && num > 0 ? '+' : '') + Math.round(num).toString() + 'x';
}

export const DIGIT_SUBSCRIPT: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

export const SUBSCRIPT_DIGIT: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

export const DIGIT_SUBSCRIPT_RE = new RegExp(`(${Object.values(DIGIT_SUBSCRIPT).join('|')})+`, 'g');

/**
 * Convert number to its subscript form
 *
 * e.g. 11 -> ₁₁
 */
function formatSubscript(num: number): string {
  return num
    .toString()
    .split('')
    .map((digit) => DIGIT_SUBSCRIPT[digit])
    .join('');
}

/**
 * Convert subscript number to normal number
 *
 * e.g. '₁₁' -> 11
 */
export function parseSubscript(num: string): number {
  const parsed = num.replace(DIGIT_SUBSCRIPT_RE, (match) => {
    let digits = '';
    for (let i = 0; i < match.length; i++) {
      const char = match[i];
      if (char && SUBSCRIPT_DIGIT[char]) {
        digits += SUBSCRIPT_DIGIT[char];
      }
    }
    return digits;
  });
  return Number(parsed);
}

/**
 * Returns the number of insignificant fractional zeroes (ie. the number
 * of zeroes after the decimal separator) in the given number.
 *
 * For example, 0.00015 has 3 insignificant fractional zeroes.
 */
function countInsignificantFractionalZeroes(value: number | string): number {
  const num = Number(value);
  if (!isValidNumber(num) || num >= 1 || Number.isInteger(num)) {
    return 0;
  }
  const zeroes = num.toExponential(0).slice(3); // eg. "1e-123".slice(3) = 123
  return Number(zeroes) - 1;
}

function isValidNumber(num: number): boolean {
  return num !== Infinity && !isNaN(num);
}

/**
 * Format a number with significant figures (up to 3 as per user preference)
 */
export function formatSignificantFigures(num: number, maxSigFigs: number = 3): string {
  if (isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  if (absNum === 0) return '0';
  
  // For very small numbers, show scientific notation
  if (absNum < 0.001 && absNum > 0) {
    return num.toExponential(Math.min(maxSigFigs - 1, 2));
  }
  
  // For large numbers, use compact notation
  if (absNum >= 1000000) {
    return formatCompact(num);
  }
  
  // For medium numbers, use standard formatting
  if (absNum >= 1000) {
    return formatNumber(num, 2);
  }
  
  // For small numbers, show appropriate decimals
  const decimals = absNum < 0.01 ? 4 : absNum < 0.1 ? 3 : 2;
  return formatNumber(num, Math.min(decimals, maxSigFigs));
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number | string, decimals: number = 2): string {
  const number = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(number)) return '0';

  // If the number rounds to a whole number, don't show decimals
  const rounded = Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
  const actualDecimals = rounded % 1 === 0 ? 0 : decimals;

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: actualDecimals,
  });
}

/**
 * Convert a number to a compact format (e.g., 1.2K, 3.4M)
 */
export function formatCompact(num: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 2,
  });

  return formatter.format(num);
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return formatNumber(num, 0);
}

/**
 * Format a wallet address for display
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format SOL amounts with consistent precision
 */
export function formatSOL(amount: number): string {
  return formatNumber(amount, 4);
}

/**
 * Format balance amounts with exact precision (no rounding)
 * Used for displaying wallet balances where exact amounts are critical
 */
export function formatBalance(
  amount: number,
  decimals: number = 6,
  locale: string = 'en-US'
): string {
  if (isNaN(amount)) return '0';
  
  // Use toFixed to maintain exact decimal places without rounding
  const fixedAmount = amount.toFixed(decimals);
  
  // Split into integer and decimal parts
  const parts = fixedAmount.split('.');
  
  // Format integer part with thousand separators
  if (parts[0]) {
    parts[0] = parseInt(parts[0]).toLocaleString(locale);
  }
  
  // Handle decimal part - show up to 3 decimal places
  if (parts.length > 1 && parts[1]) {
    const decimalPart = parts[1];
    // Take up to 3 decimal places, but don't round
    const truncatedDecimal = decimalPart.substring(0, 3);
    // Only add decimal part if it's not all zeros
    if (truncatedDecimal !== '000') {
      return `${parts[0]}.${truncatedDecimal}`;
    }
  }
  
  return parts[0] || '0';
}
