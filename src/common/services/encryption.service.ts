import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ConfigKeys } from '../constant';

@Injectable()
export class EncryptionService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Encrypt sensitive data
   * @param text Data to encrypt
   * @returns Encrypted data
   */
  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.configService.get(ConfigKeys.ENCRYPTION_KEY)),
      Buffer.from(this.configService.get(ConfigKeys.ENCRYPTION_IV)),
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt sensitive data
   * @param encryptedText Encrypted data
   * @returns Decrypted data
   */
  decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.configService.get(ConfigKeys.ENCRYPTION_KEY)),
      Buffer.from(this.configService.get(ConfigKeys.ENCRYPTION_IV)),
    );

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
