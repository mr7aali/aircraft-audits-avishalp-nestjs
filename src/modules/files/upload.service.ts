import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  createSignedUploadPayload() {
    const cloudName =
      this.configService.get<string>('storage.cloudinaryCloudName', {
        infer: true,
      }) ?? '';
    const apiKey =
      this.configService.get<string>('storage.cloudinaryApiKey', {
        infer: true,
      }) ?? '';
    const apiSecret =
      this.configService.get<string>('storage.cloudinaryApiSecret', {
        infer: true,
      }) ?? '';
    const folder =
      this.configService.get<string>('storage.cloudinaryFolder', {
        infer: true,
      }) ?? '';

    this.assertCloudinaryConfig(cloudName, apiKey, apiSecret);

    const timestamp = Math.floor(Date.now() / 1000);
    const payloadToSign = Object.fromEntries(
      Object.entries({
        timestamp,
        folder: folder.trim() || undefined,
      }).filter((entry) => entry[1] !== undefined && entry[1] !== null),
    );

    const signature = cloudinary.utils.api_sign_request(
      payloadToSign,
      apiSecret,
    );

    return {
      signature,
      timestamp,
      api_key: apiKey,
      cloud_name: cloudName,
      ...(payloadToSign.folder ? { folder: payloadToSign.folder } : {}),
    };
  }

  private assertCloudinaryConfig(
    cloudName: string,
    apiKey: string,
    apiSecret: string,
  ) {
    const values = {
      cloudName: cloudName.trim(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
    };

    const hasMissingValues = Object.values(values).some((value) => !value);
    const hasPlaceholderValues = Object.values(values).some((value) =>
      value.startsWith('your-'),
    );

    if (hasMissingValues || hasPlaceholderValues) {
      throw new InternalServerErrorException(
        'Cloudinary upload is not configured on the backend. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the Nest .env file.',
      );
    }
  }
}
