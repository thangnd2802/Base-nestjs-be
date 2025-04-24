import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { ConfigKeys } from 'src/common/constant';
import { EncryptionService } from 'src/common/services/encryption.service';
import { createTemporaryAuthCode, getBasicAuthToken } from 'src/common/util';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { UserProvider } from 'src/user/enums';
import { SolanaService } from 'src/wallet/solana-wallet.service';

@Injectable()
export class TwitterOAuthService {
  private readonly logger = new Logger(TwitterOAuthService.name);
  private TWITTER_OAUTH_CLIENT_ID: string;
  private TWITTER_OAUTH_CLIENT_SECRET: string;
  private TWITTER_OAUTH_REDIRECT_URI: string;
  private TWITTER_OAUTH_TOKEN_API_URL: string;
  private TWITTER_USERINFO_API_URL: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly solanaService: SolanaService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.TWITTER_OAUTH_CLIENT_ID = this.configService.get(
      ConfigKeys.TWITTER_OAUTH_CLIENT_ID,
    );
    this.TWITTER_OAUTH_CLIENT_SECRET = this.configService.get(
      ConfigKeys.TWITTER_OAUTH_CLIENT_SECRET,
    );
    this.TWITTER_OAUTH_REDIRECT_URI = this.configService.get(
      ConfigKeys.TWITTER_OAUTH_REDIRECT_URI,
    );
    this.TWITTER_OAUTH_TOKEN_API_URL = this.configService.get(
      ConfigKeys.TWITTER_OAUTH_TOKEN_API_URL,
    );
    this.TWITTER_USERINFO_API_URL = this.configService.get(
      ConfigKeys.TWITTER_USERINFO_API_URL,
    );
  }

  // private getBasicAuthToken(): string {
  //   return Buffer.from(
  //     `${this.TWITTER_OAUTH_CLIENT_ID}:${this.TWITTER_OAUTH_CLIENT_SECRET}`,
  //     'utf8',
  //   ).toString('base64');
  // }

  async getToken(code: string, codeVerifier: string) {
    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: this.TWITTER_OAUTH_CLIENT_ID,
      redirect_uri: this.TWITTER_OAUTH_REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    try {
      const res = await axios.post(
        this.TWITTER_OAUTH_TOKEN_API_URL,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${getBasicAuthToken(this.TWITTER_OAUTH_CLIENT_ID, this.TWITTER_OAUTH_CLIENT_SECRET)}`,
          },
        },
      );
      return res.data;
    } catch (err) {
      this.logger.error(
        `Failed to get token: ${err.response?.data || err.message}`,
      );
      return null;
    }
  }

  async getUser(
    accessToken: string,
  ): Promise<{ user: any; authCode: string } | null> {
    try {
      const res = await axios.get(this.TWITTER_USERINFO_API_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const user = res.data?.data;
      const tempAuthCode = createTemporaryAuthCode();
      if (user) {
        const existingUser = await this.userModel
          .findOne({
            providerId: user.id,
            provider: UserProvider.TWITTER,
          })
          .exec();
        if (!existingUser) {
          const newSolWallet = this.solanaService.generateWallet();
          const newUser = new this.userModel({
            providerId: user.id,
            provider: UserProvider.TWITTER,
            firstName: user.name,
            username: user.username,
            solanaWalletPublicKey: newSolWallet.publicKey,
            encryptedSolanaWalletPrivateKey: this.encryptionService.encrypt(
              newSolWallet.privateKey,
            ),
            tempAuthCode: tempAuthCode,
            tempAuthCodeExpiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          });
          await newUser.save();
        } else {
          existingUser.firstName = user.name;
          existingUser.username = user.username;
          existingUser.tempAuthCode = tempAuthCode;
          existingUser.tempAuthCodeExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
          await existingUser.save();
        }
      }
      return {
        user: user,
        authCode: tempAuthCode,
      };
    } catch (err) {
      this.logger.error(
        `Failed to fetch user: ${err.response?.data || err.message}`,
      );
      return null;
    }
  }
}
