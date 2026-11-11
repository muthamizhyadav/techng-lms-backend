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
import { Admin, AdminDocument } from '@modules/admins/entities/admin.entity';
import { AdminRole, AdminStatus } from '@shared/enums/user-status.enum';
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
  ResetTrainerCredentialsDto,
  UpdateTrainerStatusDto,
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
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
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
    const modulesWithIds = (dto.modules || []).map((m, mIdx) => {
      const mId = m._id || (m as any).id || generateUuid();
      return {
        ...m,
        _id: mId,
        id: mId,
        order: m.order ?? mIdx + 1,
        chapters: (m.chapters || []).map((c, cIdx) => {
          const cId = c._id || (c as any).id || generateUuid();
          return {
            ...c,
            _id: cId,
            id: cId,
            order: c.order ?? cIdx + 1,
            attachments: (c.attachments || []).map((att) => {
              const attId = att._id || (att as any).id || generateUuid();
              return {
                ...att,
                _id: attId,
                id: attId,
              };
            }),
          };
        }),
      };
    });

    const attachmentsWithIds = (dto.attachments || []).map((att) => {
      const attId = att._id || (att as any).id || generateUuid();
      return {
        ...att,
        _id: attId,
        id: attId,
      };
    });

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

    const modulesWithIds = (dto.modules || []).map((m, mIdx) => {
      const mId = m._id || (m as any).id || generateUuid();
      return {
        ...m,
        _id: mId,
        id: mId,
        order: m.order ?? mIdx + 1,
        chapters: (m.chapters || []).map((c, cIdx) => {
          const cId = c._id || (c as any).id || generateUuid();
          return {
            ...c,
            _id: cId,
            id: cId,
            order: c.order ?? cIdx + 1,
            attachments: (c.attachments || []).map((att) => {
              const attId = att._id || (att as any).id || generateUuid();
              return {
                ...att,
                _id: attId,
                id: attId,
              };
            }),
          };
        }),
      };
    });

    const attachmentsWithIds = (dto.attachments || []).map((att) => {
      const attId = att._id || (att as any).id || generateUuid();
      return {
        ...att,
        _id: attId,
        id: attId,
      };
    });

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

  async findAllTrainers(): Promise<any[]> {
    const trainers = await this.freeCourseTrainerModel
      .find({ deletedAt: null })
      .sort({ order: 1, createdAt: -1 })
      .exec();

    const [courses, admins] = await Promise.all([
      this.freeCourseModel
        .find({ deletedAt: null })
        .select('trainerId trainerName')
        .exec(),
      this.adminModel
        .find({ deletedAt: null, role: AdminRole.TRAINER })
        .select('username email lastLoginAt lastLoginIp lastLoginDevice lastLoginBrowser activeSessionId activeDeviceId activeDeviceName activeSessionExpiresAt activeSessionLoggedInAt')
        .exec(),
    ]);

    const adminMap = new Map<string, any>();
    for (const a of admins) {
      if ((a as any).username) adminMap.set((a as any).username.toLowerCase(), a);
      if (a.email) adminMap.set(a.email.toLowerCase(), a);
      if (a.id) adminMap.set(a.id, a);
    }

    return trainers.map((t) => {
      const json = t.toJSON ? t.toJSON() : (t as any);
      const count = courses.filter(
        (c) =>
          c.trainerId === t._id ||
          (c.trainerName && t.name && c.trainerName.toLowerCase() === t.name.toLowerCase()),
      ).length;

      const linkedAdmin =
        (t.username && adminMap.get(t.username.toLowerCase())) ||
        (t.email && adminMap.get(t.email.toLowerCase())) ||
        (t.adminId && adminMap.get(t.adminId));

      const hasActiveSession = Boolean(
        linkedAdmin?.activeSessionId &&
        linkedAdmin?.activeSessionExpiresAt &&
        new Date(linkedAdmin.activeSessionExpiresAt) > new Date(),
      );

      return {
        ...json,
        coursesCount: count,
        lastLoginAt: linkedAdmin?.lastLoginAt || null,
        lastLoginIp: linkedAdmin?.lastLoginIp || null,
        lastLoginDevice: linkedAdmin?.lastLoginDevice || null,
        lastLoginBrowser: linkedAdmin?.lastLoginBrowser || null,
        hasActiveSession,
        activeDeviceName: linkedAdmin?.activeDeviceName || null,
        activeSessionLoggedInAt: linkedAdmin?.activeSessionLoggedInAt || null,
      };
    });
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

  async createTrainer(dto: CreateFreeTrainerDto): Promise<any> {
    const rawUsername = (
      dto.username ||
      dto.email?.split('@')[0] ||
      dto.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    )
      .trim()
      .toLowerCase();

    // Check if username is already in use
    const existingAdminByUsername = await this.adminModel.findOne({
      username: rawUsername,
      deletedAt: null,
    });
    const existingTrainerByUsername = await this.freeCourseTrainerModel.findOne({
      username: rawUsername,
      deletedAt: null,
    });
    if (existingAdminByUsername || existingTrainerByUsername) {
      throw new ConflictException(
        `Username "${rawUsername}" is already assigned to another account`,
      );
    }

    const rawEmail = (
      dto.email || `${rawUsername}@trainers.techng.in`
    )
      .trim()
      .toLowerCase();

    // Check if email is in use
    const existingAdminByEmail = await this.adminModel.findOne({
      email: rawEmail,
      deletedAt: null,
    });
    if (existingAdminByEmail) {
      throw new ConflictException(`Email "${rawEmail}" is already registered`);
    }

    // Set secure password
    const plainPassword =
      dto.password?.trim() ||
      `Trainer@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await PasswordUtil.hash(plainPassword);

    // 1. Create Free Course Trainer Profile
    const trainer = await this.freeCourseTrainerModel.create({
      ...dto,
      username: rawUsername,
      email: rawEmail,
      isActive: dto.isActive !== false,
    });

    // 2. Create Admin Auth Account with role 'trainer'
    const names = dto.name.trim().split(' ');
    const firstName = names[0] || dto.name;
    const lastName = names.slice(1).join(' ') || '';

    const admin = await this.adminModel.create({
      _id: generateUuid(),
      username: rawUsername,
      email: rawEmail,
      password: hashedPassword,
      firstName,
      lastName,
      phone: dto.phone || null,
      avatar: dto.avatar || null,
      role: AdminRole.TRAINER,
      status: dto.isActive !== false ? AdminStatus.ACTIVE : AdminStatus.INACTIVE,
      designation: dto.designation || 'Lead Trainer',
      bio: dto.bio || '',
      trainerProfileId: trainer._id,
      permissions: [
        'free_course.create',
        'free_course.edit',
        'free_course.delete',
        'free_course.upload',
      ],
    });

    trainer.adminId = admin._id;
    await trainer.save();

    const result = trainer.toJSON();
    return {
      ...result,
      temporaryPassword: plainPassword,
    };
  }

  async updateTrainer(
    id: string,
    dto: UpdateFreeTrainerDto,
  ): Promise<any> {
    const trainer = await this.findTrainerById(id);

    if (dto.username && dto.username.toLowerCase() !== trainer.username?.toLowerCase()) {
      const cleanUsername = dto.username.toLowerCase().trim();
      const existing = await this.adminModel.findOne({
        username: cleanUsername,
        _id: { $ne: trainer.adminId },
        deletedAt: null,
      });
      if (existing) {
        throw new ConflictException(`Username "${cleanUsername}" is already taken`);
      }
    }

    if (dto.email && dto.email.toLowerCase() !== trainer.email?.toLowerCase()) {
      const cleanEmail = dto.email.toLowerCase().trim();
      const existing = await this.adminModel.findOne({
        email: cleanEmail,
        _id: { $ne: trainer.adminId },
        deletedAt: null,
      });
      if (existing) {
        throw new ConflictException(`Email "${cleanEmail}" is already registered`);
      }
    }

    const updated = await this.freeCourseTrainerModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      dto,
      { new: true },
    );

    // Sync admin record if linked
    if (trainer.adminId || trainer.username || trainer.email) {
      const adminFilter = trainer.adminId
        ? { _id: trainer.adminId }
        : { $or: [{ username: trainer.username }, { email: trainer.email }] };

      const names = (dto.name || trainer.name).trim().split(' ');
      const patch: Record<string, unknown> = {
        firstName: names[0],
        lastName: names.slice(1).join(' ') || '',
      };
      if (dto.username) patch.username = dto.username.toLowerCase().trim();
      if (dto.email) patch.email = dto.email.toLowerCase().trim();
      if (dto.phone !== undefined) patch.phone = dto.phone;
      if (dto.avatar !== undefined) patch.avatar = dto.avatar;
      if (dto.designation !== undefined) patch.designation = dto.designation;
      if (dto.bio !== undefined) patch.bio = dto.bio;
      if (dto.isActive !== undefined) {
        patch.status = dto.isActive ? AdminStatus.ACTIVE : AdminStatus.INACTIVE;
      }

      await this.adminModel.updateOne(adminFilter, patch);
    }

    return updated!.toJSON();
  }

  async resetTrainerCredentials(
    id: string,
    dto: ResetTrainerCredentialsDto,
  ): Promise<{ success: boolean; message: string }> {
    const trainer = await this.findTrainerById(id);
    const admin = await this.adminModel.findOne({
      $or: [
        { _id: trainer.adminId },
        { trainerProfileId: id },
        { username: trainer.username },
        { email: trainer.email },
      ],
      deletedAt: null,
    });

    if (!admin) {
      throw new NotFoundException('Corresponding trainer auth account not found');
    }

    if (dto.username) {
      const cleanUsername = dto.username.toLowerCase().trim();
      const existing = await this.adminModel.findOne({
        username: cleanUsername,
        _id: { $ne: admin._id },
        deletedAt: null,
      });
      if (existing) {
        throw new ConflictException(`Username "${cleanUsername}" is already in use`);
      }
      admin.username = cleanUsername;
      trainer.username = cleanUsername;
      await trainer.save();
    }

    if (dto.password) {
      admin.password = await PasswordUtil.hash(dto.password.trim());
    }

    await admin.save();
    return { success: true, message: 'Trainer credentials updated successfully' };
  }

  async updateTrainerStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const trainer = await this.findTrainerById(id);
    trainer.isActive = isActive;
    await trainer.save();

    await this.adminModel.updateOne(
      {
        $or: [
          { _id: trainer.adminId },
          { trainerProfileId: id },
          { username: trainer.username },
          { email: trainer.email },
        ],
      },
      {
        status: isActive ? AdminStatus.ACTIVE : AdminStatus.INACTIVE,
      },
    );

    return {
      success: true,
      message: `Trainer account ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async deleteTrainer(id: string): Promise<void> {
    const trainer = await this.findTrainerById(id);
    await this.freeCourseTrainerModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date(), isActive: false },
    );

    // Deactivate admin account
    await this.adminModel.updateOne(
      {
        $or: [
          { _id: trainer.adminId },
          { trainerProfileId: id },
          { username: trainer.username },
          { email: trainer.email },
        ],
      },
      {
        status: AdminStatus.INACTIVE,
        deletedAt: new Date(),
      },
    );
  }

  async terminateTrainerSession(id: string): Promise<{ success: boolean; message: string }> {
    const trainer = await this.findTrainerById(id);
    await this.adminModel.updateOne(
      {
        $or: [
          { _id: trainer.adminId },
          { trainerProfileId: id },
          { username: trainer.username },
          { email: trainer.email },
        ],
      },
      {
        $set: {
          activeSessionId: null,
          activeDeviceId: null,
          activeDeviceName: null,
          activeSessionIp: null,
          activeSessionExpiresAt: null,
        },
      },
    );
    return {
      success: true,
      message: `Active session for trainer "${trainer.name}" has been terminated successfully.`,
    };
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

