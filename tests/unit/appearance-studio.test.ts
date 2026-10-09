import { describe, it, expect } from 'vitest';
import { getContrastRatio, sanitizeCustomCss } from '../../src/utils/contrast.js';
import { THEME_PRESETS } from '../../src/components/profile/PublicProfileRenderer.js';

describe('Appearance Customization Studio Utilities & Presets', () => {
  describe('WCAG 2.1 Contrast Calculation', () => {
    it('should compute high contrast ratio for black on white', () => {
      const result = getContrastRatio('#000000', '#ffffff');
      expect(result.ratio).toBeGreaterThan(15);
      expect(result.score).toBe('AAA');
      expect(result.isAccessible).toBe(true);
    });

    it('should compute high contrast ratio for white on dark navy', () => {
      const result = getContrastRatio('#ffffff', '#0f172a');
      expect(result.ratio).toBeGreaterThan(10);
      expect(result.score).toBe('AAA');
      expect(result.isAccessible).toBe(true);
    });

    it('should identify failing contrast for low-contrast pairs', () => {
      const result = getContrastRatio('#aaaaaa', '#ffffff');
      expect(result.score).toBe('Fail');
      expect(result.isAccessible).toBe(false);
      expect(result.recommendation).toBeDefined();
    });

    it('should support 3-digit hex colors gracefully', () => {
      const result = getContrastRatio('#fff', '#000');
      expect(result.ratio).toBeGreaterThan(15);
      expect(result.isAccessible).toBe(true);
    });
  });

  describe('Scoped CSS Sanitizer', () => {
    it('should scope simple CSS selectors under the profile container', () => {
      const input = '.profile-title { font-size: 24px; } a { color: blue; }';
      const output = sanitizeCustomCss(input);
      expect(output).toContain('.linkplus-profile-container .profile-title');
      expect(output).toContain('.linkplus-profile-container a');
    });

    it('should strip malicious <script> tags and javascript: URIs', () => {
      const malicious = '<script>alert("hack")</script> body { background: url(javascript:alert(1)); }';
      const output = sanitizeCustomCss(malicious);
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('javascript:');
    });

    it('should strip dangerous @import rules', () => {
      const malicious = '@import url("evil.css"); h1 { color: red; }';
      const output = sanitizeCustomCss(malicious);
      expect(output).not.toContain('@import');
      expect(output).toContain('.linkplus-profile-container h1');
    });
  });

  describe('Theme Presets Coverage', () => {
    it('should provide at least 12 professional theme presets', () => {
      const presetKeys = Object.keys(THEME_PRESETS);
      expect(presetKeys.length).toBeGreaterThanOrEqual(12);
      expect(presetKeys).toContain('default');
      expect(presetKeys).toContain('editorial_cream');
      expect(presetKeys).toContain('nordic_frost');
      expect(presetKeys).toContain('minimal_light');
      expect(presetKeys).toContain('glass_aurora');
    });

    it('should ensure each preset defines valid background, text, and card colors', () => {
      Object.values(THEME_PRESETS).forEach((preset) => {
        expect(preset.name).toBeTruthy();
        expect(preset.backgroundValue).toBeTruthy();
        expect(preset.textColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
        expect(preset.cardBg).toBeTruthy();
        expect(preset.buttonStyle).toBeTruthy();
      });
    });
  });
});
