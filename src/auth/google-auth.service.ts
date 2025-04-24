import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { UserProvider } from 'src/user/enums';
import { ConfigKeys } from 'src/common/constant';
import { createTemporaryAuthCode } from 'src/common/util';
// import { BaseResponseDto } from 'src/common/base-response.dto';

@Injectable()
export class GoogleOAuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  // async exchangeAuthCode(
  //   authCode: string,
  // ): Promise<BaseResponseDto<{ access_token: string }>> {
  //   const user = await this.userModel
  //     .findOne({
  //       temporaryLoginToken: authCode,
  //       temporaryLoginExpires: {
  //         $gt: Date.now(),
  //       },
  //     })
  //     .exec();
  //   if (!user) {
  //     // return BaseResponseDto.fail('Invalid or expired token');
  //     throw new HttpException(
  //       'Invalid or expired token',
  //       HttpStatus.UNAUTHORIZED,
  //     );
  //   }
  //   const payload = {
  //     userId: user._id,
  //     provider: user.provider,
  //     providerId: user.providerId,
  //   };
  //   const token = this.jwtService.sign(payload);
  //   user.tempAuthCode = null;
  //   user.tempAuthCodeExpiresAt = null;
  //   await user.save();
  //   return BaseResponseDto.success({ access_token: token });
  // }

  getGoogleLoginUrl(fERedirectUri?: string): string {
    const clientId = this.configService.get<string>(
      ConfigKeys.GOOGLE_CLIENT_ID,
    );
    const redirectUri = this.configService.get<string>(
      ConfigKeys.GOOGLE_REDIRECT_URI,
    );

    if (!clientId || !redirectUri) {
      throw new HttpException(
        'Unimplemented',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=email%20profile`;
    if (fERedirectUri) {
      return `${authUrl}&state=${encodeURIComponent(fERedirectUri)}`;
    }
    return authUrl;
  }

  async validateOAuthUser(
    profile: any,
  ): Promise<{ user: any; authCode: string }> {
    // const oauthId = `${getUserIdProviderPrefix(provider)}${profile.id}`;

    let user = await this.userModel
      .findOne({
        providerId: profile.id,
        provider: UserProvider.GOOGLE,
      })
      .exec();

    const tempAuthCode = createTemporaryAuthCode();
    if (!user) {
      user = new this.userModel({
        providerId: profile.id,
        provider: UserProvider.GOOGLE,
        firstName: profile.name,
        lastName: '',
        email: profile.email || null, // Optional
        // solanaWalletPublicKey: newSolWallet.publicKey,
        // encryptedSolanaWalletPrivateKey: this.encryptionService.encrypt(
        //   newSolWallet.privateKey,
        // ),
        tempAuthCode: tempAuthCode,
        tempAuthCodeExpiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });
    }
    user.firstName = profile.name;
    user.email = profile.email || null;
    user.tempAuthCode = tempAuthCode;
    user.tempAuthCodeExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();
    return {
      user: user,
      authCode: tempAuthCode,
    };
  }

  async googleLogin(code: string): Promise<{ authCode: string }> {
    try {
      const { data } = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: this.configService.get<string>(ConfigKeys.GOOGLE_CLIENT_ID),
        client_secret: this.configService.get<string>(
          ConfigKeys.GOOGLE_CLIENT_SECRET,
        ),
        redirect_uri: this.configService.get<string>(
          ConfigKeys.GOOGLE_REDIRECT_URI,
        ),
        grant_type: 'authorization_code',
      });

      const userInfo = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${data.access_token}`,
      );

      const { authCode } = await this.validateOAuthUser(userInfo.data);

      return { authCode };
    } catch {
      throw new HttpException('Google login failed', HttpStatus.UNAUTHORIZED);
    }
  }
}
