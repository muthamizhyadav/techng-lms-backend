import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MarqueeAnnouncement,
  MarqueeAnnouncementSchema,
} from './entities/marquee.entity';
import { MarqueeService } from './marquee.service';
import { MarqueeAdminController } from './marquee-admin.controller';
import { MarqueePublicController } from './marquee-public.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarqueeAnnouncement.name, schema: MarqueeAnnouncementSchema },
    ]),
  ],
  controllers: [MarqueeAdminController, MarqueePublicController],
  providers: [MarqueeService],
  exports: [MarqueeService],
})
export class MarqueeModule {}

