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
import { CoursesService } from './courses.service';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { Admin } from '@modules/admins/entities/admin.entity';
import { CourseStatus } from './entities/course.entity';
import {
  CreateCourseDto,
  UpdateCourseDto,
  UpdateCourseStatusDto,
  CourseResponseDto,
} from './dto/course.dto';

@ApiTags('📚 Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ═══════════════════════════════════════════════════
  // ║  LIST ALL COURSES                                ║
  // ═══════════════════════════════════════════════════

  @Get()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'List all courses (Admin only)',
    description:
      'Paginated list of courses with status, category, and search filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CourseStatus,
    example: 'active',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    example: 'Web Design',
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'web' })
  @ApiResponse({
    status: 200,
    description: 'List of courses retrieved',
    schema: {
      example: {
        data: [],
        total: 40,
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
    @Query('status') status?: CourseStatus,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.coursesService.findAll({
      page,
      limit,
      status,
      category,
      search,
    });
  }

  // ═══════════════════════════════════════════════════
  // ║  GET COURSE BY ID                                ║
  // ═══════════════════════════════════════════════════

  @Get(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Get course by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Course UUID',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
  })
  @ApiResponse({
    status: 200,
    description: 'Course found',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.findOne(id);
  }

  // ═══════════════════════════════════════════════════
  // ║  CREATE COURSE                                   ║
  // ═══════════════════════════════════════════════════

  @Post()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course (Admin only)' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({
    status: 201,
    description: 'Course created',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(
    @Body() dto: CreateCourseDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.coursesService.create(dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  UPDATE COURSE                                   ║
  // ═══════════════════════════════════════════════════

  @Patch(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Update course details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({
    status: 200,
    description: 'Course updated',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.coursesService.update(id, dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  UPDATE COURSE STATUS                            ║
  // ═══════════════════════════════════════════════════

  @Patch(':id/status')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Update course status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiBody({ type: UpdateCourseStatusDto })
  @ApiResponse({ status: 200, description: 'Course status updated' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseStatusDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    await this.coursesService.updateStatus(id, dto.status, currentAdmin.id);
    return { message: `Course status updated to ${dto.status}` };
  }

  // ═══════════════════════════════════════════════════
  // ║  DELETE COURSE                                   ║
  // ═══════════════════════════════════════════════════

  @Delete(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete course (Admin only)',
    description: 'Soft deletes the course from the catalog',
  })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course deleted' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.coursesService.remove(id);
    return { message: 'Course deleted successfully' };
  }

  // ═══════════════════════════════════════════════════
  // ║  COURSE STATISTICS                               ║
  // ═══════════════════════════════════════════════════

  @Get('stats/overview')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get course statistics (Admin only)',
    description:
      'Total, active, published, draft, archived counts and enrollments for dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Course statistics',
    schema: {
      example: {
        total: 40,
        active: 18,
        published: 12,
        draft: 8,
        archived: 2,
        totalStudents: 1250,
        categories: 6,
      },
    },
  })
  async getCourseStats() {
    return this.coursesService.getStats();
  }
}
