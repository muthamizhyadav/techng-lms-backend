import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FreeCourse,
  FreeCourseDocument,
  FreeCourseStatus,
} from './entities/free-course.entity';
import {
  FreeCourseTrainer,
  FreeCourseTrainerDocument,
} from './entities/free-course-trainer.entity';
import {
  FreeCourseEnrollment,
  FreeCourseEnrollmentDocument,
  FreeCourseEnrollmentStatus,
} from './entities/free-course-enrollment.entity';
import { User, UserDocument } from '@modules/users/entities/user.entity';
import { UserRole, UserStatus } from '@shared/enums/role.enum';
import { PasswordUtil } from '@common/utils/password.util';
import { generateUuid } from '@common/utils/uuid.util';
import {
  CreateFreeCourseDto,
  UpdateFreeCourseDto,
} from './dto/create-free-course.dto';
import { QueryFreeCourseDto } from './dto/query-free-course.dto';
import {
  CreateFreeStudentDto,
  QueryFreeStudentDto,
  UpdateFreeStudentDto,
} from './dto/free-student.dto';
import {
  CreateFreeTrainerDto,
  UpdateFreeTrainerDto,
} from './dto/create-free-trainer.dto';

@Injectable()
export class FreeCoursesAdminService {
  constructor(
    @InjectModel(FreeCourse.name)
    private readonly freeCourseModel: Model<FreeCourseDocument>,
    @InjectModel(FreeCourseTrainer.name)
    private readonly freeCourseTrainerModel: Model<FreeCourseTrainerDocument>,
    @InjectModel(FreeCourseEnrollment.name)
    private readonly freeCourseEnrollmentModel: Model<FreeCourseEnrollmentDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // -------------------------------------------------------------
  // Free Course CRUD & Management
  // -------------------------------------------------------------

  async findAll(query: QueryFreeCourseDto): Promise<{
    data: FreeCourse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, category, search, trainerId, trainerName } = query;
    const filter: Record<string, unknown> = { deletedAt: null };

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (trainerId) {
      filter.trainerId = trainerId;
    }

    if (trainerName) {
      filter.trainerName = new RegExp(trainerName.trim(), 'i');
    }

    if (search && search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { title: regex },
        { category: regex },
        { instructor: regex },
        { trainerName: regex },
        { description: regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.freeCourseModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.freeCourseModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<FreeCourseDocument> {
    const course = await this.freeCourseModel.findOne({
      _id: id,
      deletedAt: null,
    });
    if (!course) {
      throw new NotFoundException(`Free Course with ID "${id}" not found`);
    }
    return course;
  }

  async create(
    dto: CreateFreeCourseDto,
    adminId: string,
  ): Promise<FreeCourse> {
    const modulesWithIds = (dto.modules || []).map((m, mIdx) => ({
      ...m,
      _id: m._id || generateUuid(),
      order: m.order ?? mIdx + 1,
      chapters: (m.chapters || []).map((c, cIdx) => ({
        ...c,
        _id: c._id || generateUuid(),
        order: c.order ?? cIdx + 1,
        attachments: (c.attachments || []).map((att) => ({
          ...att,
          _id: att._id || generateUuid(),
        })),
      })),
    }));

    const attachmentsWithIds = (dto.attachments || []).map((att) => ({
      ...att,
      _id: att._id || generateUuid(),
    }));

    const payload = {
      ...dto,
      modules: modulesWithIds,
      attachments: attachmentsWithIds,
      createdByAdminId: adminId,
      updatedByAdminId: adminId,
    };

    const saved = await this.freeCourseModel.create(payload);
    return saved.toJSON() as FreeCourse;
  }

  async update(
    id: string,
    dto: UpdateFreeCourseDto,
    adminId: string,
  ): Promise<FreeCourse> {
    await this.findOne(id);

    const modulesWithIds = (dto.modules || []).map((m, mIdx) => ({
      ...m,
      _id: m._id || generateUuid(),
      order: m.order ?? mIdx + 1,
      chapters: (m.chapters || []).map((c, cIdx) => ({
        ...c,
        _id: c._id || generateUuid(),
        order: c.order ?? cIdx + 1,
        attachments: (c.attachments || []).map((att) => ({
          ...att,
          _id: att._id || generateUuid(),
        })),
      })),
    }));

    const attachmentsWithIds = (dto.attachments || []).map((att) => ({
      ...att,
      _id: att._id || generateUuid(),
    }));

    const updated = await this.freeCourseModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        ...dto,
        modules: modulesWithIds,
        attachments: attachmentsWithIds,
        updatedByAdminId: adminId,
      },
      { new: true },
    );

    return updated!.toJSON() as FreeCourse;
  }

  async updateStatus(
    id: string,
    status: FreeCourseStatus,
    adminId: string,
  ): Promise<void> {
    await this.findOne(id);
    await this.freeCourseModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { status, updatedByAdminId: adminId },
    );
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.freeCourseModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
    );
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    published: number;
    draft: number;
    archived: number;
    totalStudents: number;
    categories: number;
    trainers: number;
  }> {
    const [
      total,
      active,
      published,
      draft,
      archived,
      totalStudents,
      categories,
      trainers,
    ] = await Promise.all([
      this.freeCourseModel.countDocuments({ deletedAt: null }),
      this.freeCourseModel.countDocuments({
        status: FreeCourseStatus.ACTIVE,
        deletedAt: null,
      }),
      this.freeCourseModel.countDocuments({
        status: FreeCourseStatus.PUBLISHED,
        deletedAt: null,
      }),
      this.freeCourseModel.countDocuments({
        status: FreeCourseStatus.DRAFT,
        deletedAt: null,
      }),
      this.freeCourseModel.countDocuments({
        status: FreeCourseStatus.ARCHIVED,
        deletedAt: null,
      }),
      this.freeCourseEnrollmentModel.countDocuments({
        status: FreeCourseEnrollmentStatus.ACTIVE,
      }),
      this.freeCourseModel.distinct('category', { deletedAt: null }),
      this.freeCourseTrainerModel.countDocuments({ deletedAt: null }),
    ]);

    return {
      total,
      active,
      published,
      draft,
      archived,
      totalStudents,
      categories: categories.length,
      trainers,
    };
  }

  // -------------------------------------------------------------
  // Free Course Trainer Management
  // -------------------------------------------------------------

  async findAllTrainers(): Promise<FreeCourseTrainer[]> {
    return this.freeCourseTrainerModel
      .find({ deletedAt: null })
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async findTrainerById(id: string): Promise<FreeCourseTrainerDocument> {
    const trainer = await this.freeCourseTrainerModel.findOne({
      _id: id,
      deletedAt: null,
    });
    if (!trainer) {
      throw new NotFoundException(`Trainer with ID "${id}" not found`);
    }
    return trainer;
  }

  async createTrainer(dto: CreateFreeTrainerDto): Promise<FreeCourseTrainer> {
    const saved = await this.freeCourseTrainerModel.create(dto);
    return saved.toJSON() as FreeCourseTrainer;
  }

  async updateTrainer(
    id: string,
    dto: UpdateFreeTrainerDto,
  ): Promise<FreeCourseTrainer> {
    await this.findTrainerById(id);
    const updated = await this.freeCourseTrainerModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      dto,
      { new: true },
    );
    return updated!.toJSON() as FreeCourseTrainer;
  }

  async deleteTrainer(id: string): Promise<void> {
    await this.findTrainerById(id);
    await this.freeCourseTrainerModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date(), isActive: false },
    );
  }

  async getCourseStudents(courseId: string): Promise<any[]> {
    await this.findOne(courseId);

    const enrollments = await this.freeCourseEnrollmentModel
      .find({ courseId })
      .sort({ enrolledAt: -1 })
      .exec();

    const studentIds = enrollments.map((e) => e.studentId);
    const students = await this.userModel
      .find({ _id: { $in: studentIds } })
      .exec();
    const studentMap = new Map(students.map((s) => [s.id || s._id, s]));

    return enrollments.map((enrollment) => {
      const student = studentMap.get(enrollment.studentId);
      return {
        enrollmentId: enrollment._id,
        studentId: enrollment.studentId,
        studentName: student?.fullName || student?.firstName || 'Unknown',
        email: student?.email || '',
        phone: student?.phone || null,
        progress: enrollment.progress || 0,
        completedChaptersCount: (enrollment.completedChapters || []).length,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        studentStatus: student?.status || 'active',
      };
    });
  }

  // -------------------------------------------------------------
  // Free Course Student Credentials & Account Management
  // -------------------------------------------------------------

  async createStudent(
    dto: CreateFreeStudentDto,
    adminId: string,
  ): Promise<{
    student: any;
    assignedCourses: string[];
    credentials: { email: string; temporaryPassword?: string };
  }> {
    const existing = await this.userModel.findOne({
      email: dto.email.toLowerCase().trim(),
    });

    if (existing) {
      throw new ConflictException(
        `A student with email "${dto.email}" already exists.`,
      );
    }

    const hashedPassword = await PasswordUtil.hash(dto.password);

    const createdUser = await this.userModel.create({
      _id: generateUuid(),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName ? dto.lastName.trim() : null,
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      phone: dto.phone ? dto.phone.trim() : null,
      role: UserRole.FREE_STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
    });

    const assignedCourseIds: string[] = [];

    if (dto.courseIds && dto.courseIds.length > 0) {
      const courses = await this.freeCourseModel.find({
        _id: { $in: dto.courseIds },
        deletedAt: null,
      });

      for (const course of courses) {
        await this.freeCourseEnrollmentModel.create({
          _id: generateUuid(),
          studentId: createdUser._id,
          courseId: course._id,
          status: FreeCourseEnrollmentStatus.ACTIVE,
          progress: 0,
          completedChapters: [],
          enrolledAt: new Date(),
          assignedByAdminId: adminId,
        });

        await this.freeCourseModel.findByIdAndUpdate(course._id, {
          $inc: { students: 1 },
        });

        assignedCourseIds.push(course._id);
      }
    }

    const jsonUser = createdUser.toJSON();
    delete (jsonUser as any).password;

    return {
      student: jsonUser,
      assignedCourses: assignedCourseIds,
      credentials: {
        email: dto.email,
        temporaryPassword: dto.password,
      },
    };
  }

  async findAllStudents(query: QueryFreeStudentDto): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, search, courseId } = query;

    // Filter students with role FREE_STUDENT or those having free enrollments
    const userFilter: Record<string, unknown> = {
      role: UserRole.FREE_STUDENT,
      deletedAt: null,
    };

    if (status) {
      userFilter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      userFilter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    if (courseId) {
      const enrollments = await this.freeCourseEnrollmentModel
        .find({ courseId })
        .select('studentId')
        .exec();
      const studentIds = enrollments.map((e) => e.studentId);
      userFilter._id = { $in: studentIds };
    }

    const [students, total] = await Promise.all([
      this.userModel
        .find(userFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(userFilter),
    ]);

    const studentIds = students.map((s) => s.id || s._id);

    const allEnrollments = await this.freeCourseEnrollmentModel
      .find({ studentId: { $in: studentIds } })
      .exec();

    const courseIds = [...new Set(allEnrollments.map((e) => e.courseId))];
    const courses = await this.freeCourseModel
      .find({ _id: { $in: courseIds } })
      .select('title category thumbnail')
      .exec();
    const courseMap = new Map(courses.map((c) => [c.id || c._id, c]));

    const enrollmentsByStudent = new Map<string, any[]>();
    for (const e of allEnrollments) {
      const list = enrollmentsByStudent.get(e.studentId) || [];
      const course = courseMap.get(e.courseId);
      list.push({
        enrollmentId: e._id,
        courseId: e.courseId,
        courseTitle: course?.title || 'Unknown Course',
        progress: e.progress || 0,
        completedChapters: (e.completedChapters || []).length,
        status: e.status,
        enrolledAt: e.enrolledAt,
      });
      enrollmentsByStudent.set(e.studentId, list);
    }

    const data = students.map((s) => {
      const studentEnrollments =
        enrollmentsByStudent.get(s.id || s._id) || [];
      const avgProgress =
        studentEnrollments.length > 0
          ? Math.round(
              studentEnrollments.reduce((acc, curr) => acc + curr.progress, 0) /
                studentEnrollments.length,
            )
          : 0;

      return {
        id: s.id || s._id,
        name: s.fullName || `${s.firstName} ${s.lastName || ''}`.trim(),
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        status: s.status,
        enrolledCoursesCount: studentEnrollments.length,
        enrolledCourses: studentEnrollments,
        averageProgress: avgProgress,
        createdAt: s.createdAt,
        lastLoginAt: s.lastLoginAt,
      };
    });

    return { data, total, page, limit };
  }

  async findStudentById(studentId: string): Promise<any> {
    const student = await this.userModel.findOne({
      _id: studentId,
      deletedAt: null,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    const enrollments = await this.freeCourseEnrollmentModel
      .find({ studentId })
      .sort({ enrolledAt: -1 })
      .exec();

    const courseIds = enrollments.map((e) => e.courseId);
    const courses = await this.freeCourseModel
      .find({ _id: { $in: courseIds } })
      .exec();
    const courseMap = new Map(courses.map((c) => [c.id || c._id, c]));

    const coursesWithProgress = enrollments.map((e) => {
      const course = courseMap.get(e.courseId);
      return {
        enrollmentId: e._id,
        courseId: e.courseId,
        courseTitle: course?.title || 'Unknown Course',
        courseCategory: course?.category || '',
        thumbnail: course?.thumbnail || null,
        progress: e.progress,
        completedChapters: e.completedChapters,
        currentChapterId: e.currentChapterId,
        status: e.status,
        enrolledAt: e.enrolledAt,
      };
    });

    const userJson = student.toJSON();
    delete (userJson as any).password;

    return {
      student: userJson,
      enrollments: coursesWithProgress,
    };
  }

  async updateStudent(
    studentId: string,
    dto: UpdateFreeStudentDto,
  ): Promise<any> {
    const student = await this.userModel.findOne({
      _id: studentId,
      deletedAt: null,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    const updated = await this.userModel.findOneAndUpdate(
      { _id: studentId, deletedAt: null },
      { $set: dto },
      { new: true },
    );

    const json = updated!.toJSON();
    delete (json as any).password;
    return json;
  }

  async updateStudentStatus(
    studentId: string,
    status: UserStatus,
  ): Promise<void> {
    const student = await this.userModel.findOne({
      _id: studentId,
      deletedAt: null,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    await this.userModel.updateOne(
      { _id: studentId },
      { $set: { status } },
    );
  }

  async resetStudentPassword(
    studentId: string,
    newPassword: string,
  ): Promise<void> {
    const student = await this.userModel.findOne({
      _id: studentId,
      deletedAt: null,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    const hashedPassword = await PasswordUtil.hash(newPassword);
    await this.userModel.updateOne(
      { _id: studentId },
      { $set: { password: hashedPassword, activeSessions: [] } },
    );
  }

  async assignCoursesToStudent(
    studentId: string,
    courseIds: string[],
    adminId: string,
  ): Promise<void> {
    const student = await this.userModel.findOne({
      _id: studentId,
      deletedAt: null,
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    const existingEnrollments = await this.freeCourseEnrollmentModel.find({
      studentId,
    });
    const existingCourseIds = new Set(
      existingEnrollments.map((e) => e.courseId),
    );

    const coursesToAdd = courseIds.filter((cid) => !existingCourseIds.has(cid));

    if (coursesToAdd.length > 0) {
      const validCourses = await this.freeCourseModel.find({
        _id: { $in: coursesToAdd },
        deletedAt: null,
      });

      for (const course of validCourses) {
        await this.freeCourseEnrollmentModel.create({
          _id: generateUuid(),
          studentId,
          courseId: course._id,
          status: FreeCourseEnrollmentStatus.ACTIVE,
          progress: 0,
          completedChapters: [],
          enrolledAt: new Date(),
          assignedByAdminId: adminId,
        });

        await this.freeCourseModel.findByIdAndUpdate(course._id, {
          $inc: { students: 1 },
        });
      }
    }
  }

  async unassignCourseFromStudent(
    studentId: string,
    courseId: string,
  ): Promise<void> {
    const enrollment = await this.freeCourseEnrollmentModel.findOne({
      studentId,
      courseId,
    });

    if (enrollment) {
      await this.freeCourseEnrollmentModel.deleteOne({ _id: enrollment._id });
      await this.freeCourseModel.findByIdAndUpdate(courseId, {
        $inc: { students: -1 },
      });
    }
  }
}

