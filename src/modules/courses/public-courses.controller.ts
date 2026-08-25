import {
  Controller,
  Get,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CourseStatus } from './entities/course.entity';
import { CourseResponseDto } from './dto/course.dto';

@ApiTags('🌐 Public Courses')
@Controller('public/courses')
export class PublicCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse published courses (Public)',
    description: 'Get paginated list of active/published courses for students and visitors',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 12 })
  @ApiQuery({ name: 'category', required: false, type: String, example: 'Web Development' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'React' })
  @ApiResponse({
    status: 200,
    description: 'List of published courses',
    type: [CourseResponseDto],
  })
  async getPublicCourses(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.coursesService.findAll({
      page,
      limit,
      category,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course details by ID (Public)' })
  @ApiParam({
    name: 'id',
    description: 'Course UUID',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
  })
  @ApiResponse({
    status: 200,
    description: 'Course details found',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getPublicCourseById(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.findOne(id);
  }
}
