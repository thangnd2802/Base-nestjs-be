import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from 'src/common/base.entity';
import { UserProvider } from '../enums';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: false,
  versionKey: false,
})
export class User extends BaseEntity {
  @Prop({ type: String })
  firstName: string;
  @Prop({ type: String })
  lastName: string;

  @Prop({ type: Number, default: Date.now() })
  createdAt: number;

  @Prop({ type: String })
  email: string;
  @Prop({ type: String })
  username: string;

  @Prop({ type: String })
  password: string;
  @Prop({ type: String })
  avatar: string;

  @Prop({ type: String })
  solanaWalletPublicKey: string;
  @Prop({ type: String })
  encryptedSolanaWalletPrivateKey: string;

  @Prop({ type: String })
  solanaReceivingRewardAddress: string;

  /**
   * Provider
   */
  @Prop({ type: String, enum: UserProvider })
  provider?: UserProvider;
  @Prop({ type: String, required: false })
  providerId?: string;
  /**
   * User's password reset fields
   */
  @Prop({ type: String, required: false })
  resetPasswordToken?: string; // Token to reset password
  @Prop({ type: Number, required: false })
  resetPasswordExpires?: number; // Expiration time for token

  /**
   * Temporary auth code
   */
  @Prop({ type: String, required: false })
  tempAuthCode?: string; // Temporary auth code
  @Prop({ type: Number, required: false })
  tempAuthCodeExpiresAt?: number; // Expiration time for auth code
}
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { provider: 1, providerId: 1 },
  { unique: true, name: 'user_social_provider' },
);
UserSchema.index(
  { tempAuthCode: 1, tempAuthCodeExpires: 1 },
  { name: 'user_temp_authcode' },
);
