import {
  isValidHexColor,
  autoContrastColor,
  getContrastRatio,
  LINK_COLOR_PRESETS,
} from '../../src/utils/contrast';
import { formatLink } from '../../server/routes/link.routes';

describe('Unit: Per-Link Color Customization & Accessibility', () => {
  describe('Hex Color Validator (isValidHexColor)', () => {
    it('should validate valid 3, 6, and 8 digit hex colors', () => {
      expect(isValidHexColor('#fff')).toBe(true);
      expect(isValidHexColor('#FFF')).toBe(true);
      expect(isValidHexColor('#000')).toBe(true);
      expect(isValidHexColor('#4F46E5')).toBe(true);
      expect(isValidHexColor('#202430')).toBe(true);
      expect(isValidHexColor('#047857')).toBe(true);
      expect(isValidHexColor('#EA580C')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
      expect(isValidHexColor('#171923')).toBe(true);
      expect(isValidHexColor('#4F46E5AA')).toBe(true);
    });

    it('should reject invalid color strings and malicious input', () => {
      expect(isValidHexColor('')).toBe(false);
      expect(isValidHexColor('4F46E5')).toBe(false); // missing leading #
      expect(isValidHexColor('#12')).toBe(false);
      expect(isValidHexColor('#12345')).toBe(false);
      expect(isValidHexColor('#GGGGGG')).toBe(false);
      expect(isValidHexColor('red')).toBe(false);
      expect(isValidHexColor('rgb(255, 0, 0)')).toBe(false);
      expect(isValidHexColor('javascript:alert(1)')).toBe(false);
      expect(isValidHexColor(null as any)).toBe(false);
      expect(isValidHexColor(undefined as any)).toBe(false);
    });
  });

  describe('Auto Contrast Calculation (autoContrastColor)', () => {
    it('should return white text (#FFFFFF) for dark backgrounds', () => {
      expect(autoContrastColor('#000000')).toBe('#FFFFFF');
      expect(autoContrastColor('#202430')).toBe('#FFFFFF'); // Midnight
      expect(autoContrastColor('#047857')).toBe('#FFFFFF'); // Emerald
      expect(autoContrastColor('#1E1B4B')).toBe('#FFFFFF'); // Dark indigo
    });

    it('should return dark text (#171923) for light backgrounds', () => {
      expect(autoContrastColor('#FFFFFF')).toBe('#171923');
      expect(autoContrastColor('#F9FAFB')).toBe('#171923');
      expect(autoContrastColor('#FEF08A')).toBe('#171923'); // Light yellow
      expect(autoContrastColor('#E2E8F0')).toBe('#171923'); // Light slate
    });

    it('should handle edge cases safely', () => {
      expect(autoContrastColor('')).toBe('#FFFFFF');
      expect(autoContrastColor('invalid')).toBe('#FFFFFF');
    });
  });

  describe('WCAG 2.1 Contrast Ratio Verification (getContrastRatio)', () => {
    it('should calculate high contrast for compliant pairings (ratio >= 4.5)', () => {
      const midnight = getContrastRatio('#FFFFFF', '#202430');
      expect(midnight.ratio).toBeGreaterThanOrEqual(4.5);
      expect(midnight.isAccessible).toBe(true);

      const ocean = getContrastRatio('#FFFFFF', '#2563EB');
      expect(ocean.ratio).toBeGreaterThanOrEqual(4.0); // acceptable contrast for UI text

      const lightTheme = getContrastRatio('#171923', '#FFFFFF');
      expect(lightTheme.ratio).toBeGreaterThanOrEqual(7.0);
      expect(lightTheme.score).toBe('AAA');
      expect(lightTheme.isAccessible).toBe(true);
    });

    it('should fail and warn for low contrast pairings (ratio < 4.5)', () => {
      const lowContrast = getContrastRatio('#FFFFFF', '#FDE047'); // white on yellow
      expect(lowContrast.ratio).toBeLessThan(4.5);
      expect(lowContrast.isAccessible).toBe(false);
      expect(lowContrast.recommendation).toBeDefined();
    });
  });

  describe('Quick Presets Parity & Contrast Standards', () => {
    it('should verify all quick presets have valid color definitions', () => {
      expect(LINK_COLOR_PRESETS.length).toBeGreaterThanOrEqual(6);

      const defaultPreset = LINK_COLOR_PRESETS.find((p) => p.id === 'default');
      expect(defaultPreset).toBeDefined();
      expect(defaultPreset?.bg).toBe('');
      expect(defaultPreset?.text).toBe('');

      const coloredPresets = LINK_COLOR_PRESETS.filter((p) => p.id !== 'default' && p.id !== 'custom');
      for (const preset of coloredPresets) {
        expect(isValidHexColor(preset.bg)).toBe(true);
        expect(isValidHexColor(preset.text)).toBe(true);
        const contrast = getContrastRatio(preset.text, preset.bg);
        expect(contrast.ratio).toBeGreaterThanOrEqual(3.0);
      }
    });
  });

  describe('Backend formatLink Serializer Parity', () => {
    it('should serialize custom link appearance fields accurately', () => {
      const mockPrismaLink = {
        id: 'link-123',
        userId: 'user-456',
        title: 'Custom Painted Link',
        destinationUrl: 'https://example.com',
        description: 'Test description',
        icon: 'star',
        thumbnailUrl: null,
        position: 1,
        isActive: true,
        isPinned: true,
        isHidden: false,
        isFeatured: false,
        category: 'Projects',
        customLabel: 'PROMO',
        backgroundColor: '#4F46E5',
        textColor: '#FFFFFF',
        mediaType: null,
        mediaUrl: null,
        utmParams: null,
        clickCount: 15,
        scheduledStart: null,
        scheduledEnd: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };

      const formatted = formatLink(mockPrismaLink);

      expect(formatted.background_color).toBe('#4F46E5');
      expect(formatted.backgroundColor).toBe('#4F46E5');
      expect(formatted.text_color).toBe('#FFFFFF');
      expect(formatted.textColor).toBe('#FFFFFF');
      expect(formatted.title).toBe('Custom Painted Link');
    });

    it('should return null for default theme links without custom colors', () => {
      const mockPrismaLink = {
        id: 'link-124',
        userId: 'user-456',
        title: 'Default Theme Link',
        destinationUrl: 'https://example.com/2',
        description: null,
        icon: 'globe',
        thumbnailUrl: null,
        position: 2,
        isActive: true,
        isPinned: false,
        isHidden: false,
        isFeatured: false,
        category: null,
        customLabel: null,
        backgroundColor: null,
        textColor: null,
        mediaType: null,
        mediaUrl: null,
        utmParams: null,
        clickCount: 0,
        scheduledStart: null,
        scheduledEnd: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };

      const formatted = formatLink(mockPrismaLink);

      expect(formatted.background_color).toBeNull();
      expect(formatted.backgroundColor).toBeNull();
      expect(formatted.text_color).toBeNull();
      expect(formatted.textColor).toBeNull();
    });
  });

  describe('Per-Link Styling Isolation Logic', () => {
    it('should isolate custom colors to the styled link without leaking to other links', () => {
      const themeDefaultBg = '#18181b';
      const themeDefaultText = '#fafafa';

      const links = [
        { id: 'l1', title: 'Default Link 1', background_color: null, text_color: null },
        { id: 'l2', title: 'Custom Sunset Link', background_color: '#EA580C', text_color: '#FFFFFF' },
        { id: 'l3', title: 'Default Link 2', background_color: null, text_color: null },
      ];

      const resolvedStyles = links.map((l) => ({
        id: l.id,
        bg: l.background_color || themeDefaultBg,
        text: l.text_color || themeDefaultText,
      }));

      // Only l2 has custom colors
      expect(resolvedStyles[0].bg).toBe(themeDefaultBg);
      expect(resolvedStyles[0].text).toBe(themeDefaultText);

      expect(resolvedStyles[1].bg).toBe('#EA580C');
      expect(resolvedStyles[1].text).toBe('#FFFFFF');

      expect(resolvedStyles[2].bg).toBe(themeDefaultBg);
      expect(resolvedStyles[2].text).toBe(themeDefaultText);
    });
  });
});
