import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ConfigKeys, RedisKeys } from '../constant';
import { ITweetDetailResponse } from './dtos/twitter.tweet-detail';
import axios from 'axios';
import { CacheService } from 'src/cache/cache.service';
import * as crypto from 'crypto';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private readonly TWITTER_PUBLIC_BEARER_TOKEN: string;
  private readonly TWITTER_PUBLIC_GET_TWEET_BY_ID_URL: string;
  private readonly TWITTER_GUEST_TOKEN_API_URL: string;
  private readonly TWITTER_REPLY_TWEET_URL: string;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.TWITTER_PUBLIC_BEARER_TOKEN = this.configService.get(
      ConfigKeys.TWITTER_PUBLIC_BEARER_TOKEN,
    );
    this.TWITTER_PUBLIC_GET_TWEET_BY_ID_URL = this.configService.get(
      ConfigKeys.TWITTER_PUBLIC_GET_TWEET_BY_ID_URL,
    );
    this.TWITTER_GUEST_TOKEN_API_URL = this.configService.get(
      ConfigKeys.TWITTER_GUEST_TOKEN_API_URL,
    );
    this.TWITTER_REPLY_TWEET_URL = this.configService.get(
      ConfigKeys.TWITTER_REPLY_TWEET_URL,
    );
  }

  async fetchGuestToken(): Promise<string> {
    const cachedToken = await this.cacheService.get<string>(
      RedisKeys.TWITTER_GUEST_TOKEN,
    );
    if (cachedToken) {
      this.logger.log('Using cached guest token');
      return cachedToken;
    }

    const url = this.TWITTER_GUEST_TOKEN_API_URL;
    const headers = {
      authorization: `Bearer ${this.TWITTER_PUBLIC_BEARER_TOKEN}`,
    };
    try {
      const response = await axios.post(url, {}, { headers });
      if (response.status !== 200) {
        this.logger.error('Failed to fetch guest token:', response.status);
        return null;
      }
      const guestToken = response.data.guest_token;
      await this.cacheService.set(
        RedisKeys.TWITTER_GUEST_TOKEN,
        guestToken,
        30 * 60 * 1000, // Cache for 30 minutes (in milliseconds)
      );
      return guestToken;
    } catch (error) {
      this.logger.error(
        'Error fetching guest token:',
        error?.response?.data || error.message,
      );
      return null;
    }
  }

  async fetchTweetByIdPublic(
    tweetId: string,
    guestToken?: string,
  ): Promise<ITweetDetailResponse | null> {
    const url = this.TWITTER_PUBLIC_GET_TWEET_BY_ID_URL;
    if (!guestToken) {
      guestToken = await this.fetchGuestToken();
    }
    if (!guestToken) {
      this.logger.error('Failed to fetch guest token');
      return null;
    }

    const variables = {
      tweetId: tweetId,
      withCommunity: false,
      includePromotedContent: false,
      withVoice: false,
    };

    const features = {
      creator_subscriptions_tweet_preview_api_enabled: true,
      premium_content_api_read_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      responsive_web_grok_analyze_button_fetch_trends_enabled: false,
      responsive_web_grok_analyze_post_followups_enabled: false,
      responsive_web_jetfuel_frame: false,
      responsive_web_grok_share_attachment_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: false,
      responsive_web_grok_show_grok_translated_post: false,
      responsive_web_grok_analysis_button_from_backend: true,
      creator_subscriptions_quote_tweet_preview_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
        true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      responsive_web_grok_image_annotation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_enhance_cards_enabled: false,
    };

    const params = {
      variables: JSON.stringify(variables),
      features: JSON.stringify(features),
    };

    const headers = {
      // accept: '*/*',
      // 'accept-language': 'en-US,en;q=0.9',
      authorization: `Bearer ${this.TWITTER_PUBLIC_BEARER_TOKEN}`,
      'content-type': 'application/json',
      // origin: 'https://x.com',
      // referer: 'https://x.com/',
      'x-guest-token': guestToken,
    };
    try {
      const response$ = this.httpService.get(url, { headers, params });
      const response = await firstValueFrom(response$);
      return response.data as ITweetDetailResponse;
    } catch (error) {
      this.logger.error(
        'Error fetching tweet by ID:',
        error?.response?.data || error.message,
      );
      return null;
    }
  }

  generateOAuthParams(
    url: string,
    method: string,
    credentials: {
      API_KEY: string;
      API_SECRET: string;
      ACCESS_TOKEN: string;
      ACCESS_TOKEN_SECRET: string;
    },
  ) {
    const oauthParams = {
      oauth_consumer_key: credentials.API_KEY,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: credentials.ACCESS_TOKEN,
      oauth_version: '1.0',
    } as any;

    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(new URLSearchParams(oauthParams).toString()),
    ].join('&');

    const signingKey = `${credentials.API_SECRET}&${credentials.ACCESS_TOKEN_SECRET}`;
    oauthParams.oauth_signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    return oauthParams;
  }

  buildOAuthHeader(oauthParams: object) {
    const header =
      'OAuth ' +
      Object.keys(oauthParams)
        .map(
          (key) =>
            `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`,
        )
        .join(', ');
    return header;
  }

  async replyToPost(
    botCredentials: {
      API_KEY: string;
      API_SECRET: string;
      ACCESS_TOKEN: string;
      ACCESS_TOKEN_SECRET: string;
    },
    postId: string,
    replyText: string,
  ) {
    const url = this.TWITTER_REPLY_TWEET_URL;
    // v2 API uses JSON body
    const body = JSON.stringify({
      text: replyText,
      reply: {
        in_reply_to_tweet_id: postId,
      },
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.buildOAuthHeader(
          this.generateOAuthParams(url, 'POST', botCredentials),
        ),
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: body,
    });

    if (response.status !== 201) {
      return null;
    }
    const res = await response.json();
    return res;
  }
}
