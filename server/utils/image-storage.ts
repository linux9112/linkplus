import fs from 'fs';
import path from 'path';

export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
export const ALLOWED_CATEGORIES = ['avatars', 'links', 'covers'] as const;
export type UploadCategory = typeof ALLOWED_CATEGORIES[number];

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

export interface ParsedImage {
  format: string; // e.g. 'jpeg', 'png', 'webp', 'gif', 'svg'
  ext: string;    // e.g. 'jpg', 'png', 'webp', 'gif', 'svg'
  mimeType: string; // e.g. 'image/png'
  buffer: Buffer;
  base64: string;
}

/**
 * Robustly parses a Data URI without catastrophic regex backtracking on large payloads.
 * Supports standard base64, URL-safe base64 (- and _), and optional parameters (e.g. charset).
 */
export function parseDataImageUri(dataUri: string): ParsedImage | null {
  if (!dataUri || typeof dataUri !== 'string') return null;
  const commaIdx = dataUri.indexOf(',');
  if (commaIdx === -1) return null;

  const header = dataUri.slice(0, commaIdx).trim();
  const data = dataUri.slice(commaIdx + 1);

  // Validate data:image/<format>[;param=val...];base64 header
  const headerMatch = /^data:image\/([a-zA-Z0-9+.-]+)(?:;[a-zA-Z0-9_=-]+)*;base64$/i.exec(header);
  if (!headerMatch) return null;

  const rawFormat = headerMatch[1].toLowerCase();
  let format = rawFormat;
  let ext = rawFormat;
  let mimeType = `image/${rawFormat}`;

  if (rawFormat === 'jpeg' || rawFormat === 'jpg') {
    format = 'jpeg';
    ext = 'jpg';
    mimeType = 'image/jpeg';
  } else if (rawFormat === 'svg+xml' || rawFormat === 'svg') {
    format = 'svg';
    ext = 'svg';
    mimeType = 'image/svg+xml';
  } else if (rawFormat === 'png') {
    format = 'png';
    ext = 'png';
    mimeType = 'image/png';
  } else if (rawFormat === 'webp') {
    format = 'webp';
    ext = 'webp';
    mimeType = 'image/webp';
  } else if (rawFormat === 'gif') {
    format = 'gif';
    ext = 'gif';
    mimeType = 'image/gif';
  } else {
    // Unsupported image format
    return null;
  }

  try {
    // Clean URL-safe base64 characters (- -> +, _ -> /) and strip whitespace
    const cleanBase64 = data.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0) return null;

    return {
      format,
      ext,
      mimeType,
      buffer,
      base64: cleanBase64,
    };
  } catch {
    return null;
  }
}

/**
 * Validates binary image magic headers to prevent MIME spoofing.
 */
export function validateImageMagicBytes(buffer: Buffer, declaredExt: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const ext = declaredExt.toLowerCase();

  // PNG: 89 50 4E 47
  if (ext === 'png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }

  // JPEG / JPG: FF D8 FF
  if (ext === 'jpeg' || ext === 'jpg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  // WebP: RIFF .... WEBP
  if (ext === 'webp') {
    return (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.length >= 12 &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  // GIF: GIF87a or GIF89a
  if (ext === 'gif') {
    return buffer.toString('ascii', 0, 4) === 'GIF8';
  }

  // SVG: contains <svg or <?xml
  if (ext === 'svg') {
    const head = buffer.slice(0, Math.min(buffer.length, 512)).toString('utf-8').toLowerCase();
    return head.includes('<svg') || head.includes('<?xml');
  }

  return false;
}

/**
 * Attempts to save image to disk if filesystem is writable.
 * Gracefully returns false in read-only serverless environments (e.g. Vercel) without crashing.
 */
export function saveToDiskIfPossible(category: string, filename: string, buffer: Buffer): boolean {
  try {
    const targetDir = path.join(UPLOADS_ROOT, category);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch {
    // Read-only serverless environment (e.g. Vercel EROFS)
    return false;
  }
}

/**
 * Attempts to read image from disk if available.
 */
export function readFromDiskIfPossible(category: string, filename: string): Buffer | null {
  try {
    const filePath = path.resolve(UPLOADS_ROOT, category, filename);
    if (!filePath.startsWith(UPLOADS_ROOT)) return null;
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch {
    // ignore filesystem read error
  }
  return null;
}

/**
 * Attempts to delete image from disk if available.
 */
export function deleteFromDiskIfPossible(category: string, filename: string): boolean {
  try {
    const filePath = path.resolve(UPLOADS_ROOT, category, filename);
    if (!filePath.startsWith(UPLOADS_ROOT)) return false;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
