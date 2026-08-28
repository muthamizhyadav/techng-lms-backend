import {
  Controller,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CourseCategoriesService } from './course-categories.service';
import { CourseCategoryResponseDto } from './dto/course-category.dto';

@ApiTags('🌐 Public Course Categories')
@Controller('public/course-categories')
export class PublicCourseCategoriesController {
  constructor(
    private readonly courseCategoriesService: CourseCategoriesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Browse active course categories (Public)',
    description:
      'List active categories ordered by sort order, each with the number of courses in it',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'web' })
  @ApiResponse({
    status: 200,
    description: 'List of active course categories',
    type: [CourseCategoryResponseDto],
  })
  async findActive(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.courseCategoriesService.findAll({
      page,
      limit,
      isActive: true,
      search,
    });
  }
}
