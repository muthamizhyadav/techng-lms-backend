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
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { Admin } from '@modules/admins/entities/admin.entity';
import { AdminRole } from '@shared/enums/user-status.enum';
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
import {
  CreateFreeTrainerDto,
  UpdateFreeTrainerDto,
  ResetTrainerCredentialsDto,
  UpdateTrainerStatusDto,
} from './dto/create-free-trainer.dto';
import { FreeCourseStatus } from './entities/free-course.entity';
import { UserStatus } from '@shared/enums/role.enum';

@ApiTags('🎁 Free Courses (Admin)')
@Controller('free-courses/admin')
@UseGuards(JwtAdminGuard, RolesGuard)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
  @ApiOperation({ summary: 'List all free courses with filtering & pagination' })
  async findAll(@Query() query: QueryFreeCourseDto) {
    return this.adminService.findAll(query);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
  @ApiOperation({ summary: 'Get summary stats for free courses and students' })
  async getStats() {
    return this.adminService.getStats();
  }

  // -------------------------------------------------------------
  // Trainer Endpoints (Admin & Super Admin ONLY)
  // -------------------------------------------------------------

  @Get('trainers')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'List all active free course trainers' })
  async findAllTrainers() {
    return this.adminService.findAllTrainers();
  }

  @Get('trainers/:trainerId')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get trainer details by ID' })
  @ApiParam({ name: 'trainerId' })
  async findTrainerById(@Param('trainerId') trainerId: string) {
    return this.adminService.findTrainerById(trainerId);
  }

  @Post('trainers')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Create a new trainer profile and login account' })
  async createTrainer(@Body() dto: CreateFreeTrainerDto) {
    return this.adminService.createTrainer(dto);
  }

  @Put('trainers/:trainerId')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing trainer profile' })
  @ApiParam({ name: 'trainerId' })
  async updateTrainer(
    @Param('trainerId') trainerId: string,
    @Body() dto: UpdateFreeTrainerDto,
  ) {
    return this.adminService.updateTrainer(trainerId, dto);
  }

  @Patch('trainers/:trainerId/credentials')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Update or reset trainer login credentials (username / password)' })
  @ApiParam({ name: 'trainerId' })
  async resetTrainerCredentials(
    @Param('trainerId') trainerId: string,
    @Body() dto: ResetTrainerCredentialsDto,
  ) {
    return this.adminService.resetTrainerCredentials(trainerId, dto);
  }

  @Patch('trainers/:trainerId/status')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate trainer account' })
  @ApiParam({ name: 'trainerId' })
  async updateTrainerStatus(
    @Param('trainerId') trainerId: string,
    @Body() dto: UpdateTrainerStatusDto,
  ) {
    return this.adminService.updateTrainerStatus(trainerId, dto.isActive);
  }

  @Delete('trainers/:trainerId')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Delete a trainer profile and deactivate account' })
  @ApiParam({ name: 'trainerId' })
  async deleteTrainer(@Param('trainerId') trainerId: string) {
    await this.adminService.deleteTrainer(trainerId);
    return { success: true, message: 'Trainer deleted successfully' };
  }

  @Post('trainers/:trainerId/terminate-session')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Terminate active single-device login session for a trainer' })
  @ApiParam({ name: 'trainerId' })
  async terminateTrainerSession(@Param('trainerId') trainerId: string) {
    return this.adminService.terminateTrainerSession(trainerId);
  }

  // -------------------------------------------------------------
  // Student Endpoints (Admin & Super Admin ONLY)
  // -------------------------------------------------------------

  @Get('students')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'List all free course students' })
  async findAllStudents(@Query() query: QueryFreeStudentDto) {
    return this.adminService.findAllStudents(query);
  }

  @Post('students')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Create a student login account for free courses' })
  async createStudent(
    @Body() dto: CreateFreeStudentDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.adminService.createStudent(dto, admin?.id || 'admin');
  }

  @Get('students/:studentId')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get free course student details and course progress' })
  @ApiParam({ name: 'studentId' })
  async findStudentById(@Param('studentId') studentId: string) {
    return this.adminService.findStudentById(studentId);
  }

  @Patch('students/:studentId')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Update free course student details' })
  @ApiParam({ name: 'studentId' })
  async updateStudent(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateFreeStudentDto,
  ) {
    return this.adminService.updateStudent(studentId, dto);
  }

  @Patch('students/:studentId/status')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
  @ApiOperation({ summary: 'Get a single free course by ID' })
  @ApiParam({ name: 'id' })
  async findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
  @ApiOperation({ summary: 'Create a new free course' })
  async create(
    @Body() dto: CreateFreeCourseDto,
    @CurrentAdmin() admin: Admin,
  ) {
    if (admin?.role === AdminRole.TRAINER) {
      if (!dto.trainerId && (admin as any).trainerProfileId) {
        dto.trainerId = (admin as any).trainerProfileId;
      }
      if (!dto.trainerName) {
        dto.trainerName = admin.fullName || `${admin.firstName} ${admin.lastName || ''}`.trim();
      }
    }
    return this.adminService.create(dto, admin?.id || 'admin');
  }

  @Put(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
  @ApiOperation({ summary: 'Delete (soft delete) a free course' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string) {
    await this.adminService.remove(id);
    return { success: true, message: 'Course deleted successfully' };
  }

  @Get(':id/students')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
  @ApiOperation({ summary: 'Get list of students enrolled in this free course with their progress' })
  @ApiParam({ name: 'id' })
  async getCourseStudents(@Param('id') id: string) {
    return this.adminService.getCourseStudents(id);
  }

  // -------------------------------------------------------------
  // Dedicated Free Courses S3 Uploads (Trainers & Admins)
  // -------------------------------------------------------------

  @Post('uploads/presign')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.TRAINER)
  @ApiOperation({ summary: 'Abort multipart upload for free course video' })
  async abortMultipart(@Body() dto: AbortFreeCourseMultipartDto) {
    await this.storageService.abortMultipartUpload(dto.key, dto.uploadId);
    return { success: true };
  }
}

