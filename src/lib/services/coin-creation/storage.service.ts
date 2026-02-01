import AWS from 'aws-sdk';

const {
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID,
  PUBLIC_R2_BUCKET, PUBLIC_R2_URL = 'S3_BUCKET_LINK_HERE',
} = process.env;

const PRIVATE_R2_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new AWS.S3({
  endpoint: PRIVATE_R2_URL,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

export interface UploadResult {
  url: string;
  key: string;
}

export class StorageService {
  async uploadImage(dataUri: string, mint: string): Promise<UploadResult> {
    try {
      const [_, contentType, base64Data] = dataUri.match(/^data:([^;]+);base64,(.+)$/) || [];
      if (!contentType || !base64Data) {
        throw new Error('Invalid image data format');
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const ext = contentType.split('/')[1];
      const key = `images/${mint}.${ext}`;

      await r2.putObject({
        Bucket: PUBLIC_R2_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: contentType
      }).promise();

      const imageUrl = `${PUBLIC_R2_URL}/${key}`;
      return { url: imageUrl, key };
    } catch (error) {
      console.error(`❌ Failed to upload image:`, error);
      throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadMetadata(params: {
    tokenName: string;
    tokenSymbol: string;
    tokenDescription: string;
    mint: string;
    image: string;
    twitter?: string;
    website?: string;
    telegram?: string;
  }): Promise<UploadResult> {
    try {
      const key = `metadata/${params.mint}.json`;
      const content = JSON.stringify({
        name: params.tokenName,
        symbol: params.tokenSymbol,
        description: params.tokenDescription,
        image: params.image,
        twitter: params.twitter,
        website: params.website,
        telegram: params.telegram,
      });

      await r2.putObject({
        Bucket: PUBLIC_R2_BUCKET!,
        Key: key,
        Body: Buffer.from(content),
        ContentType: 'application/json'
      }).promise();

      const metadataUrl = `${PUBLIC_R2_URL}/${key}`;
      return { url: metadataUrl, key };
    } catch (error) {
      console.error(`❌ Failed to upload metadata:`, error);
      throw new Error(`Metadata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
