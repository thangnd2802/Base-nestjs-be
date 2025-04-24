import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Redirect,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from 'src/cache/cache.service';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ConfigKeys } from 'src/common/constant';
import { TwitterOAuthService } from './twitter-auth.service';
import { GoogleOAuthService } from './google-auth.service';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('authcode')
  async getAuthcode(@Query() rq: { username: string }) {
    return this.authService.getAuthcode(rq.username);
  }
  @Post('token/exchange')
  async exchangeToken(@Body() rq: { authCode: string }) {
    return this.authService.exchangeAuthCode(rq.authCode);
  }
}

@ApiTags('Auth')
@Controller({
  path: 'auth/twitter',
  version: '1',
})
export class TwitterOAuthController {
  private readonly CLIENT_ID: string;
  private readonly CALLBACK_URL: string;
  private readonly FRONTEND_URL: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly twitterOAuthService: TwitterOAuthService,
  ) {
    this.CLIENT_ID = this.configService.get<string>(
      ConfigKeys.TWITTER_OAUTH_CLIENT_ID,
    );
    this.CALLBACK_URL = this.configService.get<string>(
      ConfigKeys.TWITTER_OAUTH_REDIRECT_URI,
    );
    this.FRONTEND_URL = this.configService.get<string>(ConfigKeys.FRONTEND_URL);
  }

  private generateCodeVerifier(): string {
    return [...crypto.getRandomValues(new Uint8Array(32))]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    return await crypto.subtle.digest('SHA-256', data).then((buffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    });
  }

  private async getCodeVerifierForState(state: string): Promise<string | null> {
    const codeVerifier = await this.cacheService.get<string>(state);
    if (codeVerifier) {
      this.cacheService.del(state); // remove once used (for security)
    }
    return codeVerifier || null;
  }

  @Get()
  async redirectToTwitter(@Res() res: Response) {
    const state = uuidv4();
    const codeVerifier = this.generateCodeVerifier(); // store this temporarily with state
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    await this.cacheService.set(state, codeVerifier, 600 * 1000); // store state + codeVerifier in cache for 10 minutes (in milliseconds)
    // this.pkceStore.set(state, codeVerifier);

    const redirectUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${this.CLIENT_ID}&redirect_uri=${this.CALLBACK_URL}&scope=tweet.read%20users.read%20offline.access&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    return res.redirect(redirectUrl);
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string, // optional: you can pass a state to verify
    @Res() res: Response,
  ) {
    const codeVerifier = await this.getCodeVerifierForState(state);

    if (!codeVerifier) {
      return res.status(400).send('Invalid or expired state');
    }

    const token = await this.twitterOAuthService.getToken(code, codeVerifier);
    if (!token) return res.redirect(this.FRONTEND_URL);

    const data = await this.twitterOAuthService.getUser(token.access_token);

    if (!data) return res.redirect(this.FRONTEND_URL);

    console.log('Twitter User:', data.user);

    // Return user info to the extension via window.postMessage
    const successHtml = `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'TWITTER_AUTH_SUCCESS',
              data: ${JSON.stringify(data)}
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `;
    res.send(successHtml);
  }
}

@ApiTags('Auth')
@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleOAuthController {
  constructor(
    private readonly googleOauthService: GoogleOAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Redirect('https://accounts.google.com/o/oauth2/auth', 302)
  @Get('login')
  async googleLoginRedirect(@Query('redirectUri') redirectUri: string) {
    return {
      url: this.googleOauthService.getGoogleLoginUrl(redirectUri),
    };
  }

  @Get('callback')
  async googleLogin(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res,
  ) {
    const redirectUri = new URL(
      decodeURIComponent(state) ??
        this.configService.get(ConfigKeys.FRONTEND_URL),
    );
    const { authCode } = await this.googleOauthService.googleLogin(code);
    redirectUri.searchParams.set('auth_code', authCode);
    return res.redirect(redirectUri);
  }
}
