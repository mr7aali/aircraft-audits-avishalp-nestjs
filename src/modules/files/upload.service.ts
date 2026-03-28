import { Injectable } from '@nestjs/common';
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
}
