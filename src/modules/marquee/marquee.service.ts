import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MarqueeAnnouncement,
  MarqueeAnnouncementDocument,
} from './entities/marquee.entity';
import {
  CreateMarqueeDto,
  UpdateMarqueeDto,
  QueryMarqueeDto,
} from './dto/marquee.dto';
import { generateUuid } from '@common/utils/uuid.util';

@Injectable()
export class MarqueeService {
  constructor(
    @InjectModel(MarqueeAnnouncement.name)
    private readonly marqueeModel: Model<MarqueeAnnouncementDocument>,
  ) {}

  async create(dto: CreateMarqueeDto, adminId?: string): Promise<MarqueeAnnouncement> {
    const created = await this.marqueeModel.create({
      _id: generateUuid(),
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      createdByAdminId: adminId || null,
      updatedByAdminId: adminId || null,
      deletedAt: null,
    });
    return created.toJSON() as MarqueeAnnouncement;
  }

  async findAll(query: QueryMarqueeDto): Promise<{
    data: MarqueeAnnouncement[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { deletedAt: null };

    if (typeof query.isActive === 'boolean') {
      filter.isActive = query.isActive;
    }

    if (query.search && query.search.trim()) {
      filter.text = { $regex: query.search.trim(), $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.marqueeModel
        .find(filter)
        .sort({ order: 1, priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.marqueeModel.countDocuments(filter),
    ]);

    return {
      data: data.map((item) => item.toJSON() as MarqueeAnnouncement),
      total,
      page,
      limit,
    };
  }

  async findActive(): Promise<MarqueeAnnouncement[]> {
    const now = new Date();

    const items = await this.marqueeModel
      .find({
        deletedAt: null,
        isActive: true,
        $and: [
          {
            $or: [{ startDate: null }, { startDate: { $lte: now } }],
          },
          {
            $or: [{ endDate: null }, { endDate: { $gte: now } }],
          },
        ],
      })
      .sort({ order: 1, priority: -1, createdAt: -1 })
      .exec();

    // Default fallbacks if empty
    if (items.length === 0) {
      return [
        {
          _id: 'default_1',
          id: 'default_1',
          text: '🔥 SPECIAL OFFER: Flat 50% OFF on all Full Stack Bootcamps! Use Code: TECH50',
          linkUrl: '/free-courses',
          linkText: 'Explore',
          badgeText: '50% OFF',
          icon: 'zap',
          priority: 1,
          order: 1,
          isActive: true,
        } as MarqueeAnnouncement,
        {
          _id: 'default_2',
          id: 'default_2',
          text: '⚡ New Batch Starting This Monday for Playwright & Automation Testing!',
          linkUrl: '/free-courses',
          linkText: 'Join Now',
          badgeText: 'NEW',
          icon: 'sparkles',
          priority: 2,
          order: 2,
          isActive: true,
        } as MarqueeAnnouncement,
        {
          _id: 'default_3',
          id: 'default_3',
          text: '🎓 Get 1-on-1 Free Mentorship Session on Every Course Enrollment',
          linkUrl: '/free-courses',
          linkText: 'Claim Free Session',
          badgeText: 'FREE',
          icon: 'award',
          priority: 3,
          order: 3,
          isActive: true,
        } as MarqueeAnnouncement,
        {
          _id: 'default_4',
          id: 'default_4',
          text: '🚀 Certified Cloud Architect & DevOps Course – Extra 20% Instant Discount',
          linkUrl: '/free-courses',
          linkText: 'View Details',
          badgeText: '20% OFF',
          icon: 'flame',
          priority: 4,
          order: 4,
          isActive: true,
        } as MarqueeAnnouncement,
      ];
    }

    return items.map((i) => i.toJSON() as MarqueeAnnouncement);
  }

  async findOne(id: string): Promise<MarqueeAnnouncement> {
    const item = await this.marqueeModel.findOne({ _id: id, deletedAt: null });
    if (!item) {
      throw new NotFoundException(`Marquee announcement with ID "${id}" not found`);
    }
    return item.toJSON() as MarqueeAnnouncement;
  }

  async update(
    id: string,
    dto: UpdateMarqueeDto,
    adminId?: string,
  ): Promise<MarqueeAnnouncement> {
    await this.findOne(id);

    const updatePayload: Record<string, unknown> = {
      ...dto,
      updatedByAdminId: adminId || null,
    };

    if (dto.startDate !== undefined) {
      updatePayload.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      updatePayload.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    const updated = await this.marqueeModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updatePayload },
      { new: true },
    );

    return updated!.toJSON() as MarqueeAnnouncement;
  }

  async updateStatus(
    id: string,
    isActive: boolean,
    adminId?: string,
  ): Promise<MarqueeAnnouncement> {
    await this.findOne(id);
    const updated = await this.marqueeModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive, updatedByAdminId: adminId || null } },
      { new: true },
    );
    return updated!.toJSON() as MarqueeAnnouncement;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.marqueeModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date(), isActive: false } },
    );
  }
}

