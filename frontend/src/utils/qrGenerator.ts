import QRCode from 'qrcode';

/**
 * Generates a data URL (PNG) representation of a QR code given a payload.
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

/**
 * Generates a full asset deep-link URL for physical QR tags.
 */
export function buildAssetQRDeepLink(qrCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://warehouse-app.company.com';
  return `${origin}/scan?code=${encodeURIComponent(qrCode)}`;
}
