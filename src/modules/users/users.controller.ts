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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UserStatus } from '@shared/enums/role.enum';
import {
  CreateUserDto,
  UpdatePasswordDto,
  UpdateUserDto,
  UserResponseDto,
} from './dto/user.dto';

@ApiTags('👨‍🎓 Students / Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'List all students (Admin only)',
    description: 'Paginated list of all registered students with filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    example: 'active',
  })
  @ApiResponse({
    status: 200,
    description: 'List of students retrieved',
    schema: {
      example: {
        data: [],
        total: 100,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Get student by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Student UUID',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
  })
  @ApiResponse({
    status: 200,
    description: 'Student found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create student account (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Student created',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Update student status (Admin only)',
    description: 'Activate, suspend, or deactivate a student account',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'suspended', 'pending'],
          example: 'active',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: UserStatus,
  ) {
    await this.usersService.updateStatus(id, status);
    return { message: `Student status updated to ${status}` };
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('student-access-token')
  @ApiOperation({ summary: 'Get my profile (Student)' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved',
    type: UserResponseDto,
  })
  async getMyProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('student-access-token')
  @ApiOperation({ summary: 'Update my profile (Student)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('student-access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change my password (Student)' })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changeMyPassword(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    await this.usersService.updatePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('student-access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete my account (Student)',
    description: 'Soft deletes the student account',
  })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteMyAccount(@CurrentUser('id') userId: string) {
    await this.usersService.remove(userId);
    return { message: 'Your account has been deleted successfully' };
  }

  @Get('me/completion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('student-access-token')
  @ApiOperation({
    summary: 'Get my profile completion percentage',
    description:
      'Returns completion %, isComplete flag, and missing fields list',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile completion data',
    schema: {
      example: {
        percentage: 65,
        isComplete: false,
        missingFields: ['Phone Number', 'Address', 'Highest Qualification'],
      },
    },
  })
  async getMyProfileCompletion(@CurrentUser('id') userId: string) {
    return this.usersService.getProfileCompletion(userId);
  }

  @Get('stats/overview')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get student statistics (Admin only)',
    description:
      'Total, active, inactive, pending, suspended counts for dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Student statistics',
    schema: {
      example: {
        total: 25480,
        active: 22100,
        inactive: 1200,
        pending: 1800,
        suspended: 380,
      },
    },
  })
  async getUserStats() {
    return this.usersService.countByStatus();
  }
}
