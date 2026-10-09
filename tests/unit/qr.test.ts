import { describe, it, expect } from 'vitest';
import qrcode from 'qrcode';
import { verifyQrCode } from '../setup.js';

describe('Unit: QR Code Studio & jsQR Verification', () => {
  it('should generate QR code bit matrix with Level H error correction', () => {
    const url = 'https://linkpulse.io/creative_director';
    const qr = qrcode.create(url, { errorCorrectionLevel: 'H' });

    expect(qr.modules).toBeDefined();
    expect(qr.modules.size).toBeGreaterThanOrEqual(21);
    expect(qr.errorCorrectionLevel.bit).toBeDefined();
  });

  it('should programmatically decode standard profile URLs via jsQR', async () => {
    const testUrls = [
      'https://linkpulse.io/john',
      'https://linkpulse.io/alex_99',
      'https://linkpulse.io/tech-innovator',
    ];

    for (const url of testUrls) {
      const result = await verifyQrCode(url, { errorCorrectionLevel: 'H' });
      expect(result.scannable).toBe(true);
      expect(result.decodedUrl).toBe(url);
    }
  });

  it('should programmatically decode URLs with query strings and UTM tags', async () => {
    const longUrl = 'https://linkpulse.io/creator?ref=qr&utm_source=flyer&utm_campaign=summer_2026';
    const result = await verifyQrCode(longUrl, { errorCorrectionLevel: 'H' });

    expect(result.scannable).toBe(true);
    expect(result.decodedUrl).toBe(longUrl);
  });
});
