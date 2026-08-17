// src/modules/auth/auth-admin.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { Admin } from '@modules/admins/entities/admin.entity';
import { AdminRole } from '@shared/enums/user-status.enum';
import {
  AdminLoginDto,
  AdminRegisterDto,
  AdminResponseDto,
} from '@modules/admins/dto/admin.dto';
import { RefreshTokenDto } from './dto/auth.dto';

@ApiTags('🛡️ Admin Auth')
@Controller('auth/admin')
export class AuthAdminController {
  constructor(private readonly authService: AuthService) {}

  // ═══════════════════════════════════════════════════
  // ║  FIRST-TIME SETUP (No Auth Required)            ║
  // ═══════════════════════════════════════════════════

  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'First-time Super Admin setup',
    description:
      'Creates the first Super Admin without authentication. Only works when zero admins exist. Remove/disable after initial setup.',
  })
  @ApiBody({ type: AdminRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'First Super Admin created successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
        admin: {
          id: '0f8fad5b-d9cb-469f-a165-70867728950e',
          email: 'super@techng.in',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Setup already completed — admins already exist',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async setup(@Body() dto: AdminRegisterDto) {
    return this.authService.adminRegister(dto, null);
  }

  // ═══════════════════════════════════════════════════
  // ║  CREATE ADMIN (Super Admin Only)                ║
  // ═══════════════════════════════════════════════════

  @Post('register')
  @UseGuards(JwtAdminGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Create new admin account (Super Admin only)',
    description: 'Only existing Super Admin can create new admin accounts.',
  })
  @ApiBody({ type: AdminRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
        admin: {
          id: '0f8fad5b-d9cb-469f-a165-70867728950e',
          email: 'admin@techng.in',
          firstName: 'Vikram',
          lastName: 'Rao',
          role: 'admin',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Only Super Admin can create admins',
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async register(
    @Body() dto: AdminRegisterDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.authService.adminRegister(dto, currentAdmin?.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  ADMIN LOGIN                                    ║
  // ═══════════════════════════════════════════════════

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Admin login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
        admin: {
          id: '0f8fad5b-d9cb-469f-a165-70867728950e',
          email: 'admin@techng.in',
          firstName: 'Vikram',
          lastName: 'Rao',
          role: 'super_admin',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 403, description: 'Admin account suspended' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async login(@Body() dto: AdminLoginDto, @Ip() ipAddress: string) {
    return this.authService.adminLogin(dto, ipAddress);
  }

  // ═══════════════════════════════════════════════════
  // ║  REFRESH TOKEN                                  ║
  // ═══════════════════════════════════════════════════

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh admin access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'New tokens generated',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.adminRefresh(dto);
  }

  // ═══════════════════════════════════════════════════
  // ║  LOGOUT                                         ║
  // ═══════════════════════════════════════════════════

  @Post('logout')
  @UseGuards(JwtAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Logout admin (revokes refresh token)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentAdmin('id') adminId: string) {
    await this.authService.adminLogout(adminId);
    return { message: 'Logged out successfully' };
  }

  // ═══════════════════════════════════════════════════
  // ║  GET CURRENT ADMIN PROFILE                      ║
  // ═══════════════════════════════════════════════════

  @Get('me')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Admin profile retrieved',
    type: AdminResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentAdmin() admin: Admin) {
    return this.authService.getAdminProfile(admin.id);
  }
}
