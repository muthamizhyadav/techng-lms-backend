import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LoginActivityService, LoginActivityQuery } from './login-activity.service';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { AdminRole } from '@shared/enums/user-status.enum';

@ApiTags('🛡️ Login Activity (Admin)')
@Controller('admin/activity')
@UseGuards(JwtAdminGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
@ApiBearerAuth('admin-access-token')
export class LoginActivityController {
  constructor(private readonly activityService: LoginActivityService) {}

  @Get('logins')
  @ApiOperation({ summary: 'Get recent login activity across admins, trainers, and students' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'admin, trainer, student' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getRecentLogins(@Query() query: LoginActivityQuery) {
    return this.activityService.findRecent(query);
  }
}

