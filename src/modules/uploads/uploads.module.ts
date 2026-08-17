import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { R2Service } from './r2.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, R2Service],
  exports: [R2Service],
})
export class UploadsModule {}
