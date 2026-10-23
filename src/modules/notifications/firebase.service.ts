import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

export interface PushNotificationPayload {
  title: string;
  body: string;
  /** Values are coerced to strings because FCM data messages only accept strings. */
  data?: Record<string, string | number | boolean | null | undefined>;
  /** URL opened when the notification is clicked (web push only). */
  link?: string;
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: Messaging | null = null;
  private adminPanelUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');
    this.adminPanelUrl = this.configService.get<string>(
      'firebase.adminPanelUrl',
    );

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials are not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications are disabled.',
      );
      return;
    }

    try {
      const app: App = getApps().length
        ? getApps()[0]
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
          });

      this.messaging = getMessaging(app);
      this.logger.log('Firebase Cloud Messaging initialised.');
    } catch (error) {
      this.logger.error(
        `Failed to initialise Firebase Cloud Messaging: ${(error as Error).message}`,
      );
    }
  }

  get isEnabled(): boolean {
    return this.messaging !== null;
  }

  /**
   * Sends a notification to every token and returns the tokens Firebase
   * reported as invalid so the caller can prune them from storage.
   */
  async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<string[]> {
    const messaging = this.messaging;
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];

    if (!messaging || uniqueTokens.length === 0) {
      return [];
    }

    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.data ?? {})) {
      if (value !== undefined && value !== null) {
        data[key] = String(value);
      }
    }
    if (payload.link) {
      data.link = payload.link;
    }

    const absoluteLink = this.resolveLink(payload.link);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: uniqueTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data,
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/favicon.svg',
          },
          // FCM requires an absolute URL here, otherwise the whole send fails.
          fcmOptions: absoluteLink ? { link: absoluteLink } : undefined,
        },
      });

      const invalidTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (
          !result.success &&
          result.error &&
          INVALID_TOKEN_CODES.has(result.error.code)
        ) {
          invalidTokens.push(uniqueTokens[index]);
        }
      });

      if (invalidTokens.length > 0) {
        this.logger.warn(
          `Pruning ${invalidTokens.length} stale push token(s).`,
        );
      }

      return invalidTokens;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private resolveLink(link?: string): string | undefined {
    if (!link) {
      return undefined;
    }

    try {
      const url = new URL(link, this.adminPanelUrl);
      // FCM rejects non-HTTPS click targets, so omit the link in local dev.
      return url.protocol === 'https:' ? url.href : undefined;
    } catch {
      return undefined;
    }
  }
}
