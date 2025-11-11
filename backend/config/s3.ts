import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const PRESIGNED_URL_EXPIRATION = 3600; // 1 hora

/**
 * Genera una URL presignada para subir un archivo
 */
export async function generateUploadUrl(
  groupId: number,
  filename: string,
  contentType: string
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME no configurado');
  }

  const timestamp = Date.now();
  const key = `groups/${groupId}/files/${timestamp}_${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });

  try {
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRATION
    });
    return url;
  } catch (error) {
    logger.error('Error generando URL de upload', error);
    throw error;
  }
}

/**
 * Genera una URL presignada para descargar un archivo
 */
export async function generateDownloadUrl(s3Key: string): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME no configurado');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  try {
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRATION
    });
    return url;
  } catch (error) {
    logger.error('Error generando URL de download', error);
    throw error;
  }
}

/**
 * Valida el tamaño del archivo (máximo 10 MB)
 */
export function validateFileSize(size: number): boolean {
  const MAX_SIZE = 10485760; // 10 MB en bytes
  return size <= MAX_SIZE;
}

/**
 * Valida el tipo de archivo permitido
 */
export function validateFileType(mimetype: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  return allowedTypes.includes(mimetype);
}

