import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminsService } from './admins.service';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { Admin } from './entities/admin.entity';
import { AdminRole } from '@shared/enums/user-status.enum';
import {
  CreateAdminDto,
  UpdateAdminDto,
  UpdateAdminPasswordDto,
  UpdateAdminStatusDto,
  UpdateAdminRoleDto,
  AdminResponseDto,
} from './dto/admin.dto';

@ApiTags('🛡️ Admins')
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  // ═══════════════════════════════════════════════════
  // ║  LIST ALL ADMINS                                ║
  // ═══════════════════════════════════════════════════

  @Get()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'List all admins',
    description: 'Any admin can view the admin directory',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of admins retrieved',
    schema: {
      example: {
        data: [],
        total: 15,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminsService.findAll(page, limit);
  }

  // ═══════════════════════════════════════════════════
  // ║  GET ADMIN BY ID                                ║
  // ═══════════════════════════════════════════════════

  @Get(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiParam({
    name: 'id',
    description: 'Admin UUID',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin found',
    type: AdminResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminsService.findOne(id);
  }

  // ═══════════════════════════════════════════════════
  // ║  CREATE ADMIN (Super Admin Only)                ║
  // ═══════════════════════════════════════════════════

  @Post()
  @UseGuards(JwtAdminGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Create new admin (Super Admin only)',
    description: 'Creates a new admin account with role and permissions',
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Admin created',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only Super Admin can create admins',
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(
    @Body() dto: CreateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminsService.create(dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  UPDATE ADMIN PROFILE (Self or Super Admin)     ║
  // ═══════════════════════════════════════════════════

  @Patch(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Update admin profile',
    description:
      'Admins can update their own profile. Super Admin can update any admin.',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    type: AdminResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Can only update your own profile or need Super Admin access',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    if (id !== currentAdmin.id && !currentAdmin.isSuperAdmin()) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.adminsService.update(id, dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  UPDATE ADMIN STATUS (Super Admin Only)         ║
  // ═══════════════════════════════════════════════════

  @Patch(':id/status')
  @UseGuards(JwtAdminGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Update admin status (Super Admin only)',
    description: 'Activate, suspend, or deactivate an admin account',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiBody({ type: UpdateAdminStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({
    status: 403,
    description: 'Cannot change own status or last Super Admin',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminStatusDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminsService.updateStatus(id, dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  UPDATE ADMIN ROLE (Super Admin Only)           ║
  // ═══════════════════════════════════════════════════

  @Patch(':id/role')
  @UseGuards(JwtAdminGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Update admin role & permissions (Super Admin only)',
    description:
      'Change role and custom permissions. Cannot demote last Super Admin.',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiBody({ type: UpdateAdminRoleDto })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({
    status: 403,
    description: 'Cannot change own role or last Super Admin',
  })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminRoleDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.adminsService.updateRole(id, dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  CHANGE PASSWORD (Self Only)                    ║
  // ═══════════════════════════════════════════════════

  @Patch(':id/password')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change admin password (Self only)',
    description: 'Admins can only change their own password',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiBody({ type: UpdateAdminPasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 403,
    description: 'Can only change your own password',
  })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminPasswordDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    if (id !== currentAdmin.id) {
      throw new ForbiddenException('You can only change your own password');
    }
    await this.adminsService.updatePassword(id, dto);
    return { message: 'Password changed successfully' };
  }

  // ═══════════════════════════════════════════════════
  // ║  DELETE ADMIN (Super Admin Only)                ║
  // ═══════════════════════════════════════════════════

  @Delete(':id')
  @UseGuards(JwtAdminGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete admin (Super Admin only)',
    description:
      'Soft deletes an admin account. Cannot delete self or last Super Admin.',
  })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiResponse({ status: 200, description: 'Admin deleted' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete self or last Super Admin',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    await this.adminsService.remove(id, currentAdmin.id);
    return { message: 'Admin deleted successfully' };
  }

  // ═══════════════════════════════════════════════════
  // ║  SELF — GET OWN PROFILE                         ║
  // ═══════════════════════════════════════════════════

  @Get('me/profile')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Get my admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved',
    type: AdminResponseDto,
  })
  async getMyProfile(@CurrentAdmin() admin: Admin) {
    return this.adminsService.findOne(admin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  SUPER ADMIN — ADMIN STATS                      ║
  // ═══════════════════════════════════════════════════

  @Get('stats/overview')
  @UseGuards(JwtAdminGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get admin statistics (Super Admin only)',
    description: 'Total admins, active count, role distribution, recent logins',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin statistics',
    schema: {
      example: {
        totalAdmins: 15,
        activeAdmins: 12,
        byRole: {
          super_admin: 2,
          admin: 8,
          support: 3,
          finance: 2,
        },
        recentLogins: 5,
      },
    },
  })
  async getAdminStats() {
    return this.adminsService.getAdminStats();
  }
}
