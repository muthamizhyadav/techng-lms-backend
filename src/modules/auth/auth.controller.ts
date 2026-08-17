// src/modules/auth/auth.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  RefreshTokenDto,
  StudentLoginDto,
  StudentRegisterDto,
} from './dto/auth.dto';
import { User } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user.dto';

@ApiTags('🎓 Student Auth')
@Controller('auth/student')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ═══════════════════════════════════════════════════
  // ║  STUDENT REGISTER                               ║
  // ═══════════════════════════════════════════════════

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new student account' })
  @ApiBody({ type: StudentRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Student registered successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: '0f8fad5b-d9cb-469f-a165-70867728950e',
          email: 'rahul@email.com',
          firstName: 'Rahul',
          lastName: 'Kumar',
          status: 'pending',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async register(@Body() dto: StudentRegisterDto) {
    return this.authService.studentRegister(dto);
  }

  // ═══════════════════════════════════════════════════
  // ║  STUDENT LOGIN                                  ║
  // ═══════════════════════════════════════════════════

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student login' })
  @ApiBody({ type: StudentLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: '0f8fad5b-d9cb-469f-a165-70867728950e',
          email: 'rahul@email.com',
          firstName: 'Rahul',
          lastName: 'Kumar',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 403, description: 'Account not active' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async login(@Body() dto: StudentLoginDto) {
    return this.authService.studentLogin(dto);
  }

  // ═══════════════════════════════════════════════════
  // ║  REFRESH TOKEN                                  ║
  // ═══════════════════════════════════════════════════

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
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
    return this.authService.studentRefresh(dto);
  }

  // ═══════════════════════════════════════════════════
  // ║  LOGOUT                                         ║
  // ═══════════════════════════════════════════════════

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('student-access-token')
  @ApiOperation({ summary: 'Logout student (revokes refresh token)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser('id') userId: string) {
    await this.authService.studentLogout(userId);
    return { message: 'Logged out successfully' };
  }

  // ═══════════════════════════════════════════════════
  // ║  GET CURRENT STUDENT PROFILE                    ║
  // ═══════════════════════════════════════════════════

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('student-access-token')
  @ApiOperation({ summary: 'Get current student profile' })
  @ApiResponse({
    status: 200,
    description: 'Student profile retrieved',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getStudentProfile(user.id);
  }
}
