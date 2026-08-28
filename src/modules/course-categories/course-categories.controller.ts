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
  ParseBoolPipe,
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
import { CourseCategoriesService } from './course-categories.service';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { Admin } from '@modules/admins/entities/admin.entity';
import {
  CreateCourseCategoryDto,
  UpdateCourseCategoryDto,
  CourseCategoryResponseDto,
} from './dto/course-category.dto';

@ApiTags('🏷️ Course Categories')
@Controller('course-categories')
export class CourseCategoriesController {
  constructor(
    private readonly courseCategoriesService: CourseCategoriesService,
  ) {}

  // ═══════════════════════════════════════════════════
  // ║  LIST ALL COURSE CATEGORIES                      ║
  // ═══════════════════════════════════════════════════

  @Get()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'List all course categories (Admin only)',
    description:
      'Paginated list of course categories with activity and search filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'web' })
  @ApiResponse({
    status: 200,
    description: 'List of course categories retrieved',
    type: [CourseCategoryResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.courseCategoriesService.findAll({
      page,
      limit,
      isActive,
      search,
    });
  }

  // ═══════════════════════════════════════════════════
  // ║  COURSE CATEGORY STATISTICS                      ║
  // ═══════════════════════════════════════════════════

  @Get('stats/overview')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get course category statistics (Admin only)',
    description:
      'Total, active, inactive, parent/sub-category counts and linked courses for the dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Course category statistics',
    schema: {
      example: {
        total: 12,
        active: 10,
        inactive: 2,
        parentCategories: 6,
        subCategories: 6,
        totalCourses: 40,
      },
    },
  })
  async getStats() {
    return this.courseCategoriesService.getStats();
  }

  // ═══════════════════════════════════════════════════
  // ║  GET COURSE CATEGORY BY ID                       ║
  // ═══════════════════════════════════════════════════

  @Get(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Get course category by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Course category UUID',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
  })
  @ApiResponse({
    status: 200,
    description: 'Course category found',
    type: CourseCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course category not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseCategoriesService.findOne(id);
  }

  // ═══════════════════════════════════════════════════
  // ║  CREATE COURSE CATEGORY                          ║
  // ═══════════════════════════════════════════════════

  @Post()
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course category (Admin only)' })
  @ApiBody({ type: CreateCourseCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Course category created',
    type: CourseCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Category name or slug already exists',
  })
  async create(
    @Body() dto: CreateCourseCategoryDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.courseCategoriesService.create(dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  UPDATE COURSE CATEGORY                          ║
  // ═══════════════════════════════════════════════════

  @Patch(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Update course category details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Course category UUID' })
  @ApiBody({ type: UpdateCourseCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Course category updated',
    type: CourseCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course category not found' })
  @ApiResponse({
    status: 409,
    description: 'Category name or slug already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseCategoryDto,
    @CurrentAdmin() currentAdmin: Admin,
  ) {
    return this.courseCategoriesService.update(id, dto, currentAdmin.id);
  }

  // ═══════════════════════════════════════════════════
  // ║  DELETE COURSE CATEGORY                          ║
  // ═══════════════════════════════════════════════════

  @Delete(':id')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth('admin-access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete course category (Admin only)',
    description:
      'Soft deletes the category. Fails if it still has subcategories or assigned courses',
  })
  @ApiParam({ name: 'id', description: 'Course category UUID' })
  @ApiResponse({ status: 200, description: 'Course category deleted' })
  @ApiResponse({ status: 404, description: 'Course category not found' })
  @ApiResponse({ status: 409, description: 'Category still in use' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.courseCategoriesService.remove(id);
    return { message: 'Course category deleted successfully' };
  }
}
