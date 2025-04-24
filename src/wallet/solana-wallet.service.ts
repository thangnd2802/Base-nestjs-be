import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import * as web3 from '@solana/web3.js';
import { ConfigKeys } from 'src/common/constant';
import { formatUnits, parseUnits } from 'viem';

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  constructor(private readonly configService: ConfigService) {}
  /**
   * Generate a new Solana wallet keypair
   * @returns Object containing the public key and private key
   */
  generateWallet() {
    const keypair = web3.Keypair.generate();
    return {
      publicKey: keypair.publicKey.toString(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex'),
    };
  }

  /**
   * Restore wallet from privateKey
   * @param privateKeyHex Private key in hex format
   * @returns Keypair object
   */
  restoreWallet(privateKeyHex: string) {
    const secretKey = Buffer.from(privateKeyHex, 'hex');
    return web3.Keypair.fromSecretKey(secretKey);
  }

  /**
   * Get wallet balance
   * @param publicKey Wallet public key
   * @returns Balance in SOL
   */
  async getBalance(publicKey: string) {
    const connection = new web3.Connection(
      web3.clusterApiUrl(this.configService.get(ConfigKeys.SOLANA_CLUSTER)),
    );
    const pubKey = new web3.PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);
    return balance / web3.LAMPORTS_PER_SOL;
  }

  async getTokenBalance(
    walletPublicKey: string,
    mintAddress: string,
    decimals = 6,
  ): Promise<{
    rawBalance: string;
    adjustedBalance: string;
  }> {
    try {
      // Create connection to Solana cluster
      const connection = new web3.Connection(
        web3.clusterApiUrl(this.configService.get(ConfigKeys.SOLANA_CLUSTER)),
      );

      // Create PublicKey objects
      const walletPubKey = new web3.PublicKey(walletPublicKey);
      const mintPubKey = new web3.PublicKey(mintAddress);

      // Find token account address
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPubKey,
        { mint: mintPubKey },
      );

      // Check if token account exists
      if (tokenAccounts.value.length === 0) {
        return {
          rawBalance: '0',
          adjustedBalance: '0',
        };
      }

      // Get token balance from the first account
      const tokenAccount = tokenAccounts.value[0];
      const rawBalance =
        tokenAccount.account.data.parsed.info.tokenAmount.amount;

      // Use viem's formatUnits to handle decimal conversion
      const adjustedBalance = formatUnits(BigInt(rawBalance), decimals);

      return {
        rawBalance,
        adjustedBalance,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch token balance for wallet ${walletPublicKey} and mint ${mintAddress}: ${error.message}`,
      );
      return null;
    }
  }

  async sendToken(
    senderPrivateKey: string,
    recipientPublicKey: string,
    amount: number,
    mintAddress: string,
    decimals = 6,
  ): Promise<string> {
    try {
      const connection = new web3.Connection(
        web3.clusterApiUrl(this.configService.get(ConfigKeys.SOLANA_CLUSTER)),
      );

      const senderKeypair = this.restoreWallet(senderPrivateKey);
      const recipientPubKey = new web3.PublicKey(recipientPublicKey);
      const mintPubKey = new web3.PublicKey(mintAddress);

      const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        mintPubKey,
        senderKeypair.publicKey,
      );
      const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        mintPubKey,
        recipientPubKey,
      );

      const rawAmount = parseUnits(amount.toString(), decimals);

      // Create a transaction
      const transaction = new web3.Transaction().add(
        createTransferInstruction(
          sourceTokenAccount.address,
          destinationTokenAccount.address,
          senderKeypair.publicKey,
          rawAmount,
        ),
      );

      const signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair],
      );

      return signature;
    } catch (error) {
      this.logger.error(`Failed to send token: ${error.message}`);
      throw error;
    }
  }
}
