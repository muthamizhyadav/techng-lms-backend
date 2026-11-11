import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { AdminRole } from '@shared/enums/user-status.enum';

@ApiTags('📊 Admin Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @UseGuards(JwtAdminGuard, RolesGuard)
  @Roles(
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
    AdminRole.SUPPORT,
    AdminRole.FINANCE,
  )
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get dashboard overview (Admin only)',
    description:
      'Aggregated platform metrics, weekly enrollment/completion series, top courses, recent enrollments and student progress reports',
  })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getOverview() {
    return this.dashboardService.getOverview();
  }
}
