import crypto from 'crypto';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export class CloudinaryService {
  /**
   * Upload avatar image (base64 data URI or HTTP URL) to Cloudinary
   */
  static async uploadAvatar(fileData: string, folder = 'paypilot_avatars'): Promise<{ url: string; publicId: string }> {
    const cloudName = env.CLOUDINARY_CLOUD_NAME || 'ddf3l67z9';
    const apiKey = env.CLOUDINARY_API_KEY || '481252539828895';
    const apiSecret = env.CLOUDINARY_API_SECRET || 'es-vUyVgHkZpBb0lVpq1LuBnshA';

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const params = new URLSearchParams();
    params.append('file', fileData);
    params.append('api_key', apiKey);
    params.append('timestamp', timestamp);
    params.append('folder', folder);
    params.append('signature', signature);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const json = (await response.json()) as any;
      if (!response.ok || !json.secure_url) {
        throw new Error(json?.error?.message || 'Cloudinary avatar upload failed');
      }

      return {
        url: json.secure_url,
        publicId: json.public_id,
      };
    } catch (err: any) {
      logger.error({ err }, 'Cloudinary avatar upload error');
      throw err;
    }
  }
}
