import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags('🎓 Student Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('student-access-token')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('my-courses')
  @ApiOperation({ summary: 'Get all enrolled courses for logged in student' })
  @ApiResponse({ status: 200, description: 'List of enrolled courses' })
  async getMyCourses(@CurrentUser() user: User) {
    return this.enrollmentsService.getMyEnrolledCourses(user.id);
  }

  @Get('check/:courseId')
  @ApiOperation({ summary: 'Check if student is enrolled in a specific course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Enrollment status' })
  async checkEnrollment(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const isEnrolled = await this.enrollmentsService.isEnrolled(
      user.id,
      courseId,
    );
    return { isEnrolled };
  }

  @Get(':enrollmentId/curriculum')
  @ApiOperation({ summary: 'Get course curriculum with enrollment progress' })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Curriculum data with progress' })
  async getCurriculum(
    @CurrentUser() user: User,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.enrollmentsService.getCurriculum(user.id, enrollmentId);
  }

  @Patch(':enrollmentId/progress')
  @ApiOperation({ summary: 'Update video watch progress for a lesson' })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateProgress(
    @CurrentUser() user: User,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.enrollmentsService.updateProgress(user.id, enrollmentId, dto);
  }

  @Post(':enrollmentId/lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment UUID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Lesson completed, progress updated' })
  async completeLesson(
    @CurrentUser() user: User,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.enrollmentsService.completeLesson(user.id, enrollmentId, lessonId);
  }
}
