import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LoginActivity,
  LoginActivityDocument,
} from './entities/login-activity.entity';
import { generateUuid } from '@common/utils/uuid.util';

export interface RecordLoginParams {
  userId: string;
  userRole: string;
  email: string;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  status?: 'success' | 'failed' | 'conflict_blocked';
  failureReason?: string;
}

export interface LoginActivityQuery {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  status?: string;
}

@Injectable()
export class LoginActivityService {
  constructor(
    @InjectModel(LoginActivity.name)
    private readonly activityModel: Model<LoginActivityDocument>,
  ) {}

  private parseUserAgent(ua?: string): { device: string; browser: string; os: string } {
    if (!ua) {
      return { device: 'Unknown Device', browser: 'Browser', os: 'Unknown OS' };
    }

    let os = 'Unknown OS';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = 'Unknown Browser';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome/i.test(ua) && !/chromium|edg/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';

    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

    return { device, browser, os };
  }

  async recordLogin(params: RecordLoginParams): Promise<LoginActivity> {
    const parsed = this.parseUserAgent(params.userAgent);

    const doc = await this.activityModel.create({
      _id: generateUuid(),
      userId: params.userId,
      userRole: params.userRole,
      email: params.email.toLowerCase(),
      name: params.name || '',
      ipAddress: params.ipAddress || null,
      device: params.device || parsed.device,
      browser: params.browser || parsed.browser,
      os: params.os || parsed.os,
      status: params.status || 'success',
      failureReason: params.failureReason || null,
      loginAt: new Date(),
    });

    return doc.toJSON() as LoginActivity;
  }

  async findRecent(query: LoginActivityQuery): Promise<{
    data: LoginActivity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.role && query.role !== 'all') {
      filter.userRole = query.role;
    }

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const regex = { $regex: query.search.trim(), $options: 'i' };
      filter.$or = [{ email: regex }, { name: regex }, { ipAddress: regex }];
    }

    const [data, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ loginAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments(filter),
    ]);

    return {
      data: data.map((d) => d.toJSON() as LoginActivity),
      total,
      page,
      limit,
    };
  }

  async getLatestForUser(userId: string): Promise<LoginActivity | null> {
    const item = await this.activityModel
      .findOne({ userId, status: 'success' })
      .sort({ loginAt: -1 })
      .exec();
    return item ? (item.toJSON() as LoginActivity) : null;
  }
}

