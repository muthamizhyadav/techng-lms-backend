import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { Admin } from '@modules/admins/entities/admin.entity';
import {
  AdminNotificationList,
  NotificationsService,
} from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@UseGuards(JwtAdminGuard)
@Controller('admin/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the signed-in admin' })
  @ApiResponse({ status: 200, description: 'Paginated notification feed.' })
  async list(
    @CurrentAdmin() admin: Admin,
    @Query() query: QueryNotificationsDto,
  ): Promise<AdminNotificationList> {
    return this.notificationsService.listForAdmin(
      admin.id,
      query.page,
      query.limit,
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every notification as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read.' })
  async markAllRead(
    @CurrentAdmin() admin: Admin,
  ): Promise<{ updated: number }> {
    return this.notificationsService.markAllRead(admin.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  async markRead(
    @CurrentAdmin() admin: Admin,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.notificationsService.markRead(admin.id, id);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register this browser for admin push notifications',
  })
  @ApiResponse({ status: 200, description: 'Device token registered.' })
  async subscribe(
    @CurrentAdmin() admin: Admin,
    @Body() dto: RegisterDeviceTokenDto,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.registerToken(admin.id, dto.token);
    return { success: true };
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister this browser from admin push notifications',
  })
  @ApiResponse({ status: 200, description: 'Device token removed.' })
  async unsubscribe(
    @CurrentAdmin() admin: Admin,
    @Body() dto: RegisterDeviceTokenDto,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.unregisterToken(admin.id, dto.token);
    return { success: true };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test push notification to this admin' })
  @ApiResponse({ status: 200, description: 'Test notification dispatched.' })
  async test(@CurrentAdmin() admin: Admin): Promise<{ sent: number }> {
    return this.notificationsService.sendTestNotification(admin.id);
  }
}
