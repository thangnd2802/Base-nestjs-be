import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResponseDto } from 'src/common/base-response.dto';
import { createTemporaryAuthCode } from 'src/common/util';
import { User, UserDocument } from 'src/user/entities/user.entity';
import { JwtPayloadDto } from './dto/jwt-payload.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * TODO: This is a temporary solution. Should remove on production
   * @param username
   * @returns
   */
  async getAuthcode(
    username: string,
  ): Promise<BaseResponseDto<{ authCode: string }>> {
    try {
      const user = await this.userModel
        .findOne({
          username: username,
        })
        .exec();
      if (!user) {
        return BaseResponseDto.fail('Unauthorized');
      }

      const tempAuthCode = createTemporaryAuthCode();
      user.tempAuthCode = tempAuthCode;
      user.tempAuthCodeExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      await user.save();
      return BaseResponseDto.success({
        authCode: tempAuthCode,
      });
    } catch (err) {
      this.logger.error(
        `Failed to get auth code: ${err.response?.data || err.message}`,
      );
      return BaseResponseDto.internalError();
    }
  }

  async exchangeAuthCode(
    authCode: string,
  ): Promise<BaseResponseDto<{ access_token: string }>> {
    try {
      const user = await this.userModel
        .findOne({
          tempAuthCode: authCode,
          tempAuthCodeExpiresAt: { $gt: Date.now() },
        })
        .exec();
      if (!user) {
        return BaseResponseDto.fail('Unauthorized');
      }

      const payload: JwtPayloadDto = {
        userId: user._id,
        userProviderId: user.providerId,
        userProvider: user.provider,
      };

      const accessToken = this.jwtService.sign(payload);
      user.tempAuthCode = null;
      user.tempAuthCodeExpiresAt = null;
      await user.save();
      return BaseResponseDto.success({
        access_token: accessToken,
      });
    } catch (err) {
      this.logger.error(
        `Failed to exchange auth code: ${err.response?.data || err.message}`,
      );
      return BaseResponseDto.internalError();
    }
  }
}
