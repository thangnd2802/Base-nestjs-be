// jest.mock('@solana/web3.js', () => ({
//   Connection: jest.fn(),
//   PublicKey: jest.fn(),
//   Keypair: {
//     generate: jest.fn(),
//     fromSecretKey: jest.fn(),
//   },
//   // Add other components you're using
// }));

// jest.mock('@solana/spl-token', () => ({
//   // Mock the spl-token methods you're using
// }));

// import { Test, TestingModule } from '@nestjs/testing';
// import { ConfigService } from '@nestjs/config';
// import * as web3 from '@solana/web3.js';
// import { SolanaService } from './solana-wallet.service';

// describe('SolanaService', () => {
//   let service: SolanaService;
//   let configService: ConfigService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         SolanaService,
//         {
//           provide: ConfigService,
//           useValue: {
//             get: jest.fn(),
//           },
//         },
//       ],
//     }).compile();

//     service = module.get<SolanaService>(SolanaService);
//     configService = module.get<ConfigService>(ConfigService);
//   });

//   it('should generate a new wallet', () => {
//     const mockKeypair = {
//       publicKey: { toString: jest.fn().mockReturnValue('mockPublicKey') },
//       secretKey: new Uint8Array([1, 2, 3]),
//     };
//     jest.spyOn(web3.Keypair, 'generate').mockReturnValue(mockKeypair as any);

//     const wallet = service.generateWallet();

//     expect(wallet).toEqual({
//       publicKey: 'mockPublicKey',
//       privateKey: Buffer.from(mockKeypair.secretKey).toString('hex'),
//     });
//   });

//   it('should restore a wallet from private key', () => {
//     const mockKeypair = { publicKey: 'mockPublicKey' };
//     jest
//       .spyOn(web3.Keypair, 'fromSecretKey')
//       .mockReturnValue(mockKeypair as any);

//     const privateKeyHex = '010203';
//     const wallet = service.restoreWallet(privateKeyHex);

//     expect(wallet).toEqual(mockKeypair);
//     expect(web3.Keypair.fromSecretKey).toHaveBeenCalledWith(
//       Buffer.from(privateKeyHex, 'hex'),
//     );
//   });

//   it('should get wallet balance', async () => {
//     const mockConnection = {
//       getBalance: jest.fn().mockResolvedValue(1000000000),
//     };
//     jest
//       .spyOn(web3, 'Connection')
//       .mockImplementation(() => mockConnection as any);
//     jest
//       .spyOn(web3, 'PublicKey')
//       .mockImplementation(() => 'mockPublicKey' as any);
//     jest.spyOn(configService, 'get').mockReturnValue('devnet');

//     const balance = await service.getBalance('mockPublicKey');

//     expect(balance).toBe(1);
//     expect(mockConnection.getBalance).toHaveBeenCalledWith('mockPublicKey');
//   });

//   it('should get token balance', async () => {
//     const mockConnection = {
//       getParsedTokenAccountsByOwner: jest.fn().mockResolvedValue({
//         value: [
//           {
//             account: {
//               data: {
//                 parsed: {
//                   info: {
//                     tokenAmount: { amount: '1000000' },
//                   },
//                 },
//               },
//             },
//           },
//         ],
//       }),
//     };
//     jest
//       .spyOn(web3, 'Connection')
//       .mockImplementation(() => mockConnection as any);
//     jest
//       .spyOn(web3, 'PublicKey')
//       .mockImplementation(() => 'mockPublicKey' as any);
//     jest.spyOn(configService, 'get').mockReturnValue('devnet');

//     const balance = await service.getTokenBalance(
//       'mockWalletPublicKey',
//       'mockMintAddress',
//       6,
//     );

//     expect(balance).toEqual({
//       rawBalance: '1000000',
//       adjustedBalance: '1.0',
//     });
//   });

//   it('should send tokens', async () => {
//     const mockConnection = {
//       sendAndConfirmTransaction: jest.fn().mockResolvedValue('mockSignature'),
//     };
//     const mockKeypair = { publicKey: 'mockSenderPublicKey' };
//     jest
//       .spyOn(web3, 'Connection')
//       .mockImplementation(() => mockConnection as any);
//     jest
//       .spyOn(web3, 'PublicKey')
//       .mockImplementation(() => 'mockPublicKey' as any);
//     jest
//       .spyOn(web3.Keypair, 'fromSecretKey')
//       .mockReturnValue(mockKeypair as any);
//     jest.spyOn(configService, 'get').mockReturnValue('devnet');

//     const signature = await service.sendToken(
//       'mockPrivateKey',
//       'mockRecipientPublicKey',
//       1,
//       'mockMintAddress',
//     );

//     expect(signature).toBe('mockSignature');
//     expect(mockConnection.sendAndConfirmTransaction).toHaveBeenCalled();
//   });
// });
