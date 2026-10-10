/**
 * WCAG 2.1 Color Contrast & Accessibility Helper Utility
 */

export interface ContrastResult {
  ratio: number;
  score: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  isAccessible: boolean;
  textColor: string;
  bgColor: string;
  recommendation?: string;
}

// Convert 3 or 6 digit hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length !== 6) {
    // Attempt parsing rgba or rgb
    const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(hex);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }
    return null;
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Calculate relative luminance according to sRGB WCAG 2.1 formula
export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors (hex or rgb)
export function getContrastRatio(foreground: string, background: string): ContrastResult {
  const fgRgb = hexToRgb(foreground) || { r: 23, g: 25, b: 35 };
  const bgRgb = hexToRgb(background) || { r: 255, g: 255, b: 255 };

  const l1 = getRelativeLuminance(fgRgb);
  const l2 = getRelativeLuminance(bgRgb);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));

  let score: 'AAA' | 'AA' | 'AA Large' | 'Fail' = 'Fail';
  let isAccessible = false;
  let recommendation: string | undefined = undefined;

  if (ratio >= 7.0) {
    score = 'AAA';
    isAccessible = true;
  } else if (ratio >= 4.5) {
    score = 'AA';
    isAccessible = true;
  } else if (ratio >= 3.0) {
    score = 'AA Large';
    isAccessible = false;
    recommendation = 'Contrast is acceptable only for large headlines (18pt+). Consider darkening text or lightening background.';
  } else {
    score = 'Fail';
    isAccessible = false;
    recommendation = 'Insufficient contrast for readability. Please choose a higher contrast color pairing.';
  }

  return {
    ratio,
    score,
    isAccessible,
    textColor: foreground,
    bgColor: background,
    recommendation,
  };
}

// Sanitize custom CSS safely to prevent injection
export function sanitizeCustomCss(rawCss: string, scopeSelector = '.linkplus-profile-container'): string {
  if (!rawCss || typeof rawCss !== 'string') return '';

  // Block dangerous protocols, expressions, and imports
  let cleaned = rawCss
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/@import\s+[^;]+;/gi, '') // remove @import
    .replace(/expression\s*\([^)]*\)/gi, '') // remove IE expressions
    .replace(/javascript\s*:/gi, '') // remove javascript: URIs
    .replace(/behavior\s*:[^;]+;/gi, '') // remove IE behaviors
    .replace(/-moz-binding\s*:[^;]+;/gi, '') // remove XBL bindings
    .slice(0, 10000); // limit length to 10KB

  // Scope CSS to container
  const rules = cleaned.split('}').filter((r) => r.trim().length > 0);
  const scopedRules = rules.map((rule) => {
    const parts = rule.split('{');
    if (parts.length === 2) {
      const selectors = parts[0]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => (s.startsWith(scopeSelector) ? s : `${scopeSelector} ${s}`))
        .join(', ');
      return `${selectors} { ${parts[1].trim()} }`;
    }
    return '';
  });

  return scopedRules.filter(Boolean).join('\n');
}

/**
 * Validate hex color string (e.g. #FFF, #FFFFFF, or #FFFFFFFF)
 */
export function isValidHexColor(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex.trim());
}

/**
 * Automatically calculate high-contrast text color based on background hex
 * Returns '#FFFFFF' for dark backgrounds and '#171923' for light backgrounds
 */
export function autoContrastColor(bgHex: string): string {
  if (!bgHex || typeof bgHex !== 'string') return '#FFFFFF';
  const rgb = hexToRgb(bgHex.trim());
  if (!rgb) return '#FFFFFF';
  const lum = getRelativeLuminance(rgb);
  return lum > 0.4 ? '#171923' : '#FFFFFF';
}

export interface LinkColorPreset {
  id: string;
  label: string;
  bg: string;
  text: string;
}

export const LINK_COLOR_PRESETS: LinkColorPreset[] = [
  { id: 'default', label: 'Default Theme', bg: '', text: '' },
  { id: 'midnight', label: 'Midnight', bg: '#202430', text: '#FFFFFF' },
  { id: 'ocean', label: 'Ocean', bg: '#2563EB', text: '#FFFFFF' },
  { id: 'emerald', label: 'Emerald', bg: '#047857', text: '#FFFFFF' },
  { id: 'sunset', label: 'Sunset', bg: '#EA580C', text: '#FFFFFF' },
  { id: 'light', label: 'Light', bg: '#FFFFFF', text: '#171923' },
  { id: 'custom', label: 'Custom', bg: '', text: '' },
];

