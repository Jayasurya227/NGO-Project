import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "ap-south-1",
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  mimeType: string
): Promise<string> {
  let uploadBuffer = buffer;
  const ext = mimeTypeToExt(mimeType);
  const key = `${folder}/${randomUUID()}.${ext}`;

  if (mimeType.startsWith("image/")) {
    uploadBuffer = await stripExif(buffer);
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: uploadBuffer,
      ContentType: mimeType,
      ServerSideEncryption: "AES256",
      ACL: undefined,
    })
  );

  return key;
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSec = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSec });
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);
  const stream = response.Body as AsyncIterable<Uint8Array>;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function stripExif(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .withMetadata(false)
    .toBuffer();
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "video/mp4": "mp4",
    "text/plain": "txt",
  };
  return map[mimeType] ?? "bin";
}