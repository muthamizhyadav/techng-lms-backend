import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { Admin } from '@modules/admins/entities/admin.entity';
import { FreeCoursesAdminService } from './free-courses-admin.service';
import { FreeCourseStorageService } from './storage/free-course-storage.service';
import {
  CreateFreeCourseDto,
  UpdateFreeCourseDto,
} from './dto/create-free-course.dto';
import { QueryFreeCourseDto } from './dto/query-free-course.dto';
import {
  CreateFreeStudentDto,
  QueryFreeStudentDto,
  UpdateFreeStudentDto,
  AssignFreeCoursesDto,
  ResetFreeStudentPasswordDto,
} from './dto/free-student.dto';
import {
  PresignFreeCourseUploadDto,
  CompleteFreeCourseMultipartDto,
  AbortFreeCourseMultipartDto,
} from './dto/free-upload.dto';
import { FreeCourseStatus } from './entities/free-course.entity';
import { UserStatus } from '@shared/enums/role.enum';

@ApiTags('🎁 Free Courses (Admin)')
@Controller('free-courses/admin')
@UseGuards(JwtAdminGuard)
@ApiBearerAuth('admin-access-token')
export class FreeCoursesAdminController {
  constructor(
    private readonly adminService: FreeCoursesAdminService,
    private readonly storageService: FreeCourseStorageService,
  ) {}

  // -------------------------------------------------------------
  // Course Endpoints
  // -------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'List all free courses with filtering & pagination' })
  async findAll(@Query() query: QueryFreeCourseDto) {
    return this.adminService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get summary stats for free courses and students' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('students')
  @ApiOperation({ summary: 'List all free course students' })
  async findAllStudents(@Query() query: QueryFreeStudentDto) {
    return this.adminService.findAllStudents(query);
  }

  @Post('students')
  @ApiOperation({ summary: 'Create a student login account for free courses' })
  async createStudent(
    @Body() dto: CreateFreeStudentDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.adminService.createStudent(dto, admin?.id || 'admin');
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Get free course student details and course progress' })
  @ApiParam({ name: 'studentId' })
  async findStudentById(@Param('studentId') studentId: string) {
    return this.adminService.findStudentById(studentId);
  }

  @Patch('students/:studentId')
  @ApiOperation({ summary: 'Update free course student details' })
  @ApiParam({ name: 'studentId' })
  async updateStudent(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateFreeStudentDto,
  ) {
    return this.adminService.updateStudent(studentId, dto);
  }

  @Patch('students/:studentId/status')
  @ApiOperation({ summary: 'Update free course student status (active/suspended/inactive)' })
  @ApiParam({ name: 'studentId' })
  async updateStudentStatus(
    @Param('studentId') studentId: string,
    @Body('status') status: UserStatus,
  ) {
    await this.adminService.updateStudentStatus(studentId, status);
    return { success: true, message: `Student status updated to ${status}` };
  }

  @Post('students/:studentId/reset-password')
  @ApiOperation({ summary: 'Reset password for a free course student' })
  @ApiParam({ name: 'studentId' })
  async resetStudentPassword(
    @Param('studentId') studentId: string,
    @Body() dto: ResetFreeStudentPasswordDto,
  ) {
    await this.adminService.resetStudentPassword(studentId, dto.newPassword);
    return { success: true, message: 'Password reset successfully' };
  }

  @Post('students/:studentId/assign-courses')
  @ApiOperation({ summary: 'Assign free courses to a student' })
  @ApiParam({ name: 'studentId' })
  async assignCoursesToStudent(
    @Param('studentId') studentId: string,
    @Body() dto: AssignFreeCoursesDto,
    @CurrentAdmin() admin: Admin,
  ) {
    await this.adminService.assignCoursesToStudent(
      studentId,
      dto.courseIds,
      admin?.id || 'admin',
    );
    return { success: true, message: 'Courses assigned successfully' };
  }

  @Delete('students/:studentId/courses/:courseId')
  @ApiOperation({ summary: 'Unassign a free course from a student' })
  @ApiParam({ name: 'studentId' })
  @ApiParam({ name: 'courseId' })
  async unassignCourseFromStudent(
    @Param('studentId') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    await this.adminService.unassignCourseFromStudent(studentId, courseId);
    return { success: true, message: 'Course unassigned successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single free course by ID' })
  @ApiParam({ name: 'id' })
  async findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new free course' })
  async create(
    @Body() dto: CreateFreeCourseDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.adminService.create(dto, admin?.id || 'admin');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing free course' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFreeCourseDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.adminService.update(id, dto, admin?.id || 'admin');
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of free course (draft, published, active, archived)' })
  @ApiParam({ name: 'id' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: FreeCourseStatus,
    @CurrentAdmin() admin: Admin,
  ) {
    await this.adminService.updateStatus(id, status, admin?.id || 'admin');
    return { success: true, message: `Course status updated to ${status}` };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (soft delete) a free course' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string) {
    await this.adminService.remove(id);
    return { success: true, message: 'Course deleted successfully' };
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get list of students enrolled in this free course with their progress' })
  @ApiParam({ name: 'id' })
  async getCourseStudents(@Param('id') id: string) {
    return this.adminService.getCourseStudents(id);
  }

  // -------------------------------------------------------------
  // Dedicated Free Courses S3 Uploads
  // -------------------------------------------------------------

  @Post('uploads/presign')
  @ApiOperation({
    summary: 'Get S3 presigned PUT URL for free course asset',
    description:
      'Stores assets in dedicated free-courses/ folder per requirement: thumbnails, banners, videos, documents, attachments',
  })
  async presignUpload(@Body() dto: PresignFreeCourseUploadDto) {
    this.storageService.validateFile(
      dto.purpose,
      dto.contentType,
      dto.fileSize,
    );

    const key = this.storageService.buildKey(
      dto.purpose,
      dto.fileName,
      dto.courseId,
      dto.moduleId,
    );

    const uploadUrl = await this.storageService.getPresignedPutUrl(
      key,
      dto.contentType,
    );
    const publicUrl = this.storageService.getPublicUrl(key);

    return {
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 900,
    };
  }

  @Post('uploads/multipart')
  @ApiOperation({
    summary: 'Initialize multipart upload on S3 for large free course videos',
  })
  async initMultipart(@Body() dto: PresignFreeCourseUploadDto) {
    this.storageService.validateFile(
      dto.purpose,
      dto.contentType,
      dto.fileSize,
    );

    const key = this.storageService.buildKey(
      dto.purpose,
      dto.fileName,
      dto.courseId,
      dto.moduleId,
    );

    const { uploadId } = await this.storageService.createMultipartUpload(
      key,
      dto.contentType,
    );
    const publicUrl = this.storageService.getPublicUrl(key);

    return {
      key,
      uploadId,
      publicUrl,
      expiresIn: 900,
    };
  }

  @Get('uploads/multipart/:uploadId/parts/:partNumber/presign')
  @ApiOperation({
    summary: 'Get presigned URL for a multipart part for free courses',
  })
  @ApiParam({ name: 'uploadId' })
  @ApiParam({ name: 'partNumber' })
  @ApiQuery({ name: 'key' })
  async getPartUrl(
    @Param('uploadId') uploadId: string,
    @Param('partNumber', ParseIntPipe) partNumber: number,
    @Query('key') key: string,
  ) {
    const uploadUrl = await this.storageService.getPresignedPartUrl(
      key,
      uploadId,
      partNumber,
    );
    return { uploadUrl, partNumber };
  }

  @Post('uploads/multipart/complete')
  @ApiOperation({ summary: 'Complete multipart upload for free course video' })
  async completeMultipart(@Body() dto: CompleteFreeCourseMultipartDto) {
    await this.storageService.completeMultipartUpload(
      dto.key,
      dto.uploadId,
      dto.parts,
    );
    return {
      success: true,
      publicUrl: this.storageService.getPublicUrl(dto.key),
      key: dto.key,
    };
  }

  @Post('uploads/multipart/abort')
  @ApiOperation({ summary: 'Abort multipart upload for free course video' })
  async abortMultipart(@Body() dto: AbortFreeCourseMultipartDto) {
    await this.storageService.abortMultipartUpload(dto.key, dto.uploadId);
    return { success: true };
  }
}

