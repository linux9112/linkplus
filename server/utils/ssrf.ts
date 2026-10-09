/**
 * SSRF (Server-Side Request Forgery) & URL Security Protection
 * Validates destination URLs against internal subnets, loopback interfaces,
 * cloud provider metadata services (AWS/GCP/Azure), and unauthorized protocols.
 */

/**
 * Evaluates whether an IPv4 address belongs to a private, loopback, or link-local subnet.
 */
function isPrivateIPv4(octets: [number, number, number, number]): boolean {
  const [b1, b2] = octets;

  // Loopback (127.0.0.0/8)
  if (b1 === 127) return true;

  // Zero / Current network (0.0.0.0/8)
  if (b1 === 0) return true;

  // Private 10.0.0.0/8
  if (b1 === 10) return true;

  // Private 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;

  // Private 192.168.0.0/16
  if (b1 === 192 && b2 === 168) return true;

  // Link-local / Cloud metadata (169.254.0.0/16)
  if (b1 === 169 && b2 === 254) return true;

  // Carrier-Grade NAT (100.64.0.0/10: 100.64.0.0 - 100.127.255.255)
  if (b1 === 100 && b2 >= 64 && b2 <= 127) return true;

  // Broadcast
  if (b1 === 255) return true;

  return false;
}

/**
 * Checks whether a URL is internal, private, loopback, or otherwise blocked from outbound fetching.
 */
export function isPrivateOrBlockedUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') {
    return true;
  }

  try {
    const parsed = new URL(urlStr.trim());
    const protocol = parsed.protocol.toLowerCase();

    // Only HTTP and HTTPS protocols are permitted
    if (protocol !== 'http:' && protocol !== 'https:') {
      return true;
    }

    let hostname = parsed.hostname.toLowerCase();

    // Strip IPv6 brackets if present e.g. [::1] -> ::1
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    // Block localhost, local domains, and internal names
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '::' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.home') ||
      hostname.endsWith('.corp')
    ) {
      return true;
    }

    // Check standard dotted decimal IPv4 format
    const ipv4Match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(hostname);
    if (ipv4Match) {
      const octets: [number, number, number, number] = [
        parseInt(ipv4Match[1], 10),
        parseInt(ipv4Match[2], 10),
        parseInt(ipv4Match[3], 10),
        parseInt(ipv4Match[4], 10),
      ];

      // Validate octet range 0-255
      for (const oct of octets) {
        if (isNaN(oct) || oct < 0 || oct > 255) return true;
      }

      if (isPrivateIPv4(octets)) {
        return true;
      }
    }

    // Check IPv6 loopback, unique local (fc00::/7, fd00::/8), and link-local (fe80::/10)
    if (
      hostname === '::1' ||
      hostname.startsWith('fe80:') ||
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fd00:') ||
      hostname.startsWith('::ffff:127.') ||
      hostname.startsWith('::ffff:10.') ||
      hostname.startsWith('::ffff:192.168.') ||
      hostname.startsWith('::ffff:169.254.') ||
      hostname.startsWith('::ffff:172.')
    ) {
      return true;
    }

    return false;
  } catch {
    // Malformed URLs are blocked
    return true;
  }
}

/**
 * Validates a destination URL and returns a detailed validation result.
 */
export function validateDestinationUrl(urlStr: string): { valid: boolean; error?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, error: 'Destination URL is required' };
  }

  const trimmed = urlStr.trim();

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== 'http:' && protocol !== 'https:') {
      return {
        valid: false,
        error: 'Only HTTP and HTTPS URLs are supported',
      };
    }

    if (isPrivateOrBlockedUrl(trimmed)) {
      return {
        valid: false,
        error: 'Destination URL points to a restricted internal or private address',
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Escapes HTML characters to prevent XSS in text inputs.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
