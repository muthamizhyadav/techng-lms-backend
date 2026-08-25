import {
  Controller,
  Get,
  Param,
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
}
