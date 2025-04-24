import { Module } from '@nestjs/common';
import { AuthService, TwitterOAuthService } from './auth.service';
import { AuthController, TwitterOAuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { SolanaService } from 'src/wallet/solana-wallet.service';
import { EncryptionService } from 'src/common/services/encryption.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController, TwitterOAuthController],
  providers: [
    AuthService,
    TwitterOAuthService,
    SolanaService,
    EncryptionService,
  ],
})
export class AuthModule {}
