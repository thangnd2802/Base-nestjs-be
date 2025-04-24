import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export const generateMongoId = () => {
  return uuidv4();
};

export const getBasicAuthToken = (
  TWITTER_OAUTH_CLIENT_ID: string,
  TWITTER_OAUTH_CLIENT_SECRET: string,
) => {
  return Buffer.from(
    `${TWITTER_OAUTH_CLIENT_ID}:${TWITTER_OAUTH_CLIENT_SECRET}`,
    'utf8',
  ).toString('base64');
};

export function createTemporaryAuthCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function getKeyDisplay(key: string): string {
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}
