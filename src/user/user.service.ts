import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';
import { BaseResponseDto } from 'src/common/base-response.dto';
import { UserProfileResponseDto } from './dto/response/user-profile.rp.dto';
import { UpdateUserRequestDto } from './dto/request/update.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getProfile(
    userId: string,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return BaseResponseDto.fail('User not found');
      }
      const response: UserProfileResponseDto = {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        providerId: user.providerId,
        provider: user.provider,
        solanaWalletPublicKey: user.solanaWalletPublicKey,
        solanaReceivingRewardAddress: user.solanaReceivingRewardAddress,
      };
      return BaseResponseDto.success(response);
    } catch (err) {
      this.logger.error(`Failed to get user profile: ${err.message}`);
      return BaseResponseDto.internalError();
    }
  }

  async updateProfile(
    userId: string,
    uDto: UpdateUserRequestDto,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return BaseResponseDto.fail('User not found');
      }
      user.solanaReceivingRewardAddress = uDto.solanaReceivingRewardAddress;
      await user.save();
      const response: UserProfileResponseDto = {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        providerId: user.providerId,
        provider: user.provider,
        solanaWalletPublicKey: user.solanaWalletPublicKey,
        solanaReceivingRewardAddress: user.solanaReceivingRewardAddress,
      };
      return BaseResponseDto.success(response);
    } catch (err) {
      this.logger.error(`Failed to update user profile: ${err.message}`);
      return BaseResponseDto.internalError();
    }
  }
}
