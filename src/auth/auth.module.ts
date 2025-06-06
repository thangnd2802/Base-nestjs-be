import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthController,
  GoogleOAuthController,
  TwitterOAuthController,
} from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { SolanaService } from 'src/wallet/solana-wallet.service';
import { EncryptionService } from 'src/common/services/encryption.service';
import { TwitterOAuthService } from './twitter-auth.service';
import { GoogleOAuthService } from './google-auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController, TwitterOAuthController, GoogleOAuthController],
  providers: [
    AuthService,
    TwitterOAuthService,
    GoogleOAuthService,
    SolanaService,
    EncryptionService,
  ],
})
export class AuthModule {}
