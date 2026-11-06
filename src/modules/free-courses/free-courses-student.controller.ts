import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { FreeCoursesStudentService } from './free-courses-student.service';
import { UpdateFreeProgressDto } from './dto/free-progress.dto';

@ApiTags('🎓 Free Courses (Student)')
@Controller('free-courses/student')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('student-access-token')
export class FreeCoursesStudentController {
  constructor(private readonly studentService: FreeCoursesStudentService) {}

  @Get('my-courses')
  @ApiOperation({ summary: 'Get all enrolled free courses with progress for logged-in student' })
  async getMyCourses(@CurrentUser() user: User) {
    return this.studentService.getMyCourses(user.id);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available public free courses' })
  async getAvailableCourses(@CurrentUser() user: User) {
    return this.studentService.getAvailableCourses(user.id);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get free course details, curriculum, and player progress' })
  @ApiParam({ name: 'id' })
  async getCourseDetails(
    @CurrentUser() user: User,
    @Param('id') courseId: string,
  ) {
    return this.studentService.getCourseDetails(user.id, courseId);
  }

  @Patch('courses/:id/progress')
  @ApiOperation({ summary: 'Update playback progress for a chapter in a free course' })
  @ApiParam({ name: 'id' })
  async updateProgress(
    @CurrentUser() user: User,
    @Param('id') courseId: string,
    @Body() dto: UpdateFreeProgressDto,
  ) {
    return this.studentService.updateProgress(user.id, courseId, dto);
  }

  @Post('courses/:id/chapters/:chapterId/complete')
  @ApiOperation({ summary: 'Mark a chapter as completed in a free course' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'chapterId' })
  async completeChapter(
    @CurrentUser() user: User,
    @Param('id') courseId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.studentService.completeChapter(user.id, courseId, chapterId);
  }
}

