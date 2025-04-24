import { UserProvider } from 'src/user/enums';

export class UserProfileResponseDto {
  firstName: string;
  lastName: string;
  username: string;
  providerId: string;
  provider: UserProvider;
  solanaWalletPublicKey: string;
  solanaReceivingRewardAddress: string;
}
