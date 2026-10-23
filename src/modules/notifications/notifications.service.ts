import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Admin, AdminDocument } from '@modules/admins/entities/admin.entity';
import { AdminStatus } from '@shared/enums/user-status.enum';
import { FirebaseService, PushNotificationPayload } from './firebase.service';
import {
  AdminNotification,
  AdminNotificationDocument,
  AdminNotificationType,
} from './entities/notification.entity';

export interface AdminNotificationInput {
  title: string;
  body: string;
  type?: AdminNotificationType;
  link?: string;
  data?: Record<string, string | number | boolean | null | undefined>;
}

export interface AdminNotificationResponse {
  id: string;
  title: string;
  body: string;
  type: AdminNotificationType;
  link: string | null;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: Date;
}

export interface AdminNotificationList {
  items: AdminNotificationResponse[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
    @InjectModel(AdminNotification.name)
    private readonly notificationModel: Model<AdminNotificationDocument>,
    private readonly firebaseService: FirebaseService,
  ) {}

  /**
   * Stores the device token for the given admin and detaches it from any other
   * admin so a shared browser only notifies the currently signed-in account.
   */
  async registerToken(adminId: string, token: string): Promise<void> {
    const normalized = token.trim();

    await this.adminModel.updateMany(
      { _id: { $ne: adminId } },
      { $pull: { fcmTokens: normalized } },
    );
    await this.adminModel.updateOne(
      { _id: adminId },
      { $addToSet: { fcmTokens: normalized } },
    );
  }

  async unregisterToken(adminId: string, token: string): Promise<void> {
    await this.adminModel.updateOne(
      { _id: adminId },
      { $pull: { fcmTokens: token.trim() } },
    );
  }

  async sendTestNotification(adminId: string): Promise<{ sent: number }> {
    if (!this.firebaseService.isEnabled) {
      throw new ServiceUnavailableException(
        'Push notifications are not configured on the server.',
      );
    }

    const admin = await this.adminModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const payload: AdminNotificationInput = {
      title: 'TechNG LMS notifications enabled',
      body: 'You will now receive alerts for new students and course purchases.',
      type: AdminNotificationType.TEST,
      data: { type: 'test' },
      link: '/settings#notifications',
    };

    await this.createRecord(payload, [adminId]);
    const sent = await this.dispatch(admin.fcmTokens ?? [], payload);

    return { sent };
  }

  async listForAdmin(
    adminId: string,
    page = 1,
    limit = 20,
  ): Promise<AdminNotificationList> {
    const scope = this.scopeFor(adminId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [documents, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(scope)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean<AdminNotificationDocument[]>(),
      this.notificationModel.countDocuments(scope),
      this.notificationModel.countDocuments({
        ...scope,
        readByAdminIds: { $ne: adminId },
      }),
    ]);

    return {
      items: documents.map((document) => this.toResponse(document, adminId)),
      total,
      page: safePage,
      limit: safeLimit,
      unreadCount,
    };
  }

  async markRead(adminId: string, id: string): Promise<{ success: boolean }> {
    const result = await this.notificationModel.updateOne(
      { _id: id, ...this.scopeFor(adminId) },
      { $addToSet: { readByAdminIds: adminId } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Notification not found');
    }

    return { success: true };
  }

  async markAllRead(adminId: string): Promise<{ updated: number }> {
    const result = await this.notificationModel.updateMany(
      { ...this.scopeFor(adminId), readByAdminIds: { $ne: adminId } },
      { $addToSet: { readByAdminIds: adminId } },
    );

    return { updated: result.modifiedCount };
  }

  /**
   * Persists the notification for the dashboard bell and, when Firebase is
   * configured, fans it out as a browser push. Never throws: a failed push
   * must not roll back the business operation that triggered it.
   */
  async notifyAdmins(
    payload: AdminNotificationInput,
    recipientAdminIds: string[] = [],
  ): Promise<{ sent: number; notificationId: string | null }> {
    let notificationId: string | null = null;

    try {
      const notification = await this.createRecord(payload, recipientAdminIds);
      notificationId = notification.id;
    } catch (error) {
      this.logger.error(
        `Failed to store notification: ${(error as Error).message}`,
      );
    }

    const sent = await this.pushToAdmins(payload, recipientAdminIds);

    return { sent, notificationId };
  }

  private async createRecord(
    payload: AdminNotificationInput,
    recipientAdminIds: string[],
  ): Promise<AdminNotificationDocument> {
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.data ?? {})) {
      if (value !== undefined && value !== null) {
        data[key] = String(value);
      }
    }

    return this.notificationModel.create({
      title: payload.title,
      body: payload.body,
      type: payload.type ?? AdminNotificationType.SYSTEM,
      link: payload.link ?? null,
      data,
      recipientAdminIds,
      readByAdminIds: [],
    });
  }

  private async pushToAdmins(
    payload: AdminNotificationInput,
    recipientAdminIds: string[],
  ): Promise<number> {
    try {
      if (!this.firebaseService.isEnabled) {
        return 0;
      }

      const query: QueryFilter<AdminDocument> = {
        deletedAt: null,
        status: AdminStatus.ACTIVE,
      };

      if (recipientAdminIds.length > 0) {
        query._id = { $in: recipientAdminIds };
      }

      const admins = await this.adminModel
        .find(query)
        .select('fcmTokens')
        .lean<Array<{ fcmTokens?: string[] }>>();

      const tokens = admins.flatMap((admin) => admin.fcmTokens ?? []);
      return this.dispatch(tokens, payload);
    } catch (error) {
      this.logger.error(`Failed to notify admins: ${(error as Error).message}`);
      return 0;
    }
  }

  private async dispatch(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<number> {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];

    if (uniqueTokens.length === 0) {
      return 0;
    }

    const invalidTokens = await this.firebaseService.sendToTokens(
      uniqueTokens,
      payload,
    );

    if (invalidTokens.length > 0) {
      await this.adminModel.updateMany(
        { fcmTokens: { $in: invalidTokens } },
        { $pull: { fcmTokens: { $in: invalidTokens } } },
      );
    }

    return uniqueTokens.length - invalidTokens.length;
  }

  private scopeFor(adminId: string): QueryFilter<AdminNotificationDocument> {
    return {
      $or: [
        { recipientAdminIds: { $size: 0 } },
        { recipientAdminIds: adminId },
      ],
    };
  }

  private toResponse(
    document: AdminNotificationDocument,
    adminId: string,
  ): AdminNotificationResponse {
    return {
      id: document._id.toString(),
      title: document.title,
      body: document.body,
      type: document.type,
      link: document.link ?? null,
      data: document.data ?? {},
      isRead: (document.readByAdminIds ?? []).includes(adminId),
      createdAt: document.createdAt,
    };
  }
}
