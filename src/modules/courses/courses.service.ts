import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Course,
  CourseDocument,
  CourseStatus,
} from './entities/course.entity';
import { Enrollment, EnrollmentDocument } from '../enrollments/entities/enrollment.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

export interface CourseQuery {
  page: number;
  limit: number;
  status?: CourseStatus;
  category?: string;
  search?: string;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll(
    query: CourseQuery,
  ): Promise<{ data: Course[]; total: number; page: number; limit: number }> {
    const { page, limit, status, category, search } = query;

    const filter: Record<string, unknown> = { deletedAt: null };

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
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
      ];
    }

    const [data, total] = await Promise.all([
      this.courseModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.courseModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<CourseDocument> {
    const course = await this.courseModel.findOne({ _id: id, deletedAt: null });

    if (!course) {
      throw new NotFoundException(`Course with ID "${id}" not found`);
    }

    return course;
  }

  async create(
    createCourseDto: CreateCourseDto,
    adminId: string,
  ): Promise<Course> {
    const savedCourse = await this.courseModel.create({
      ...createCourseDto,
      createdByAdminId: adminId,
      updatedByAdminId: adminId,
    });

    return savedCourse.toJSON();
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    adminId: string,
  ): Promise<Course> {
    await this.findOne(id);

    const updatedCourse = await this.courseModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { ...updateCourseDto, updatedByAdminId: adminId },
      { new: true },
    );

    return updatedCourse.toJSON();
  }

  async updateStatus(
    id: string,
    status: CourseStatus,
    adminId: string,
  ): Promise<void> {
    await this.findOne(id);
    await this.courseModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { status, updatedByAdminId: adminId },
    );
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.courseModel.findOneAndUpdate(
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
  }> {
    const [
      total,
      active,
      published,
      draft,
      archived,
      totalStudents,
      categories,
    ] = await Promise.all([
      this.courseModel.countDocuments({ deletedAt: null }),
      this.courseModel.countDocuments({
        status: CourseStatus.ACTIVE,
        deletedAt: null,
      }),
      this.courseModel.countDocuments({
        status: CourseStatus.PUBLISHED,
        deletedAt: null,
      }),
      this.courseModel.countDocuments({
        status: CourseStatus.DRAFT,
        deletedAt: null,
      }),
      this.courseModel.countDocuments({
        status: CourseStatus.ARCHIVED,
        deletedAt: null,
      }),
      this.courseModel.aggregate<{ total: number }>([
        { $match: { deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$students' } } },
      ]),
      this.courseModel.distinct('category', { deletedAt: null }),
    ]);

    return {
      total,
      active,
      published,
      draft,
      archived,
      totalStudents: totalStudents[0]?.total ?? 0,
      categories: categories.length,
    };
  }

  async getPurchasedUsers(
    courseId: string,
    query: { page: number; limit: number; search?: string; status?: string },
  ): Promise<{
    data: Array<Record<string, unknown>>;
    total: number;
    purchasedCount: number;
    page: number;
    limit: number;
  }> {
    const course = await this.courseModel.findOne({
      _id: courseId,
      deletedAt: null,
    });
    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    const { page, limit, search, status } = query;

    const filter: Record<string, unknown> = { courseId };

    if (status) {
      filter.status = status;
    }

    let searchUserIds: string[] | null = null;
    if (search && search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      const matchingUsers = await this.userModel
        .find({
          $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex },
            { phone: regex },
          ],
        })
        .select('_id')
        .exec();
      searchUserIds = matchingUsers.map((u) => u._id.toString());

      if (searchUserIds.length === 0) {
        return { data: [], total: 0, purchasedCount: 0, page, limit };
      }
      filter.userId = { $in: searchUserIds };
    }

    const [enrollments, total, purchasedCount] = await Promise.all([
      this.enrollmentModel
        .find(filter)
        .sort({ enrolledAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.enrollmentModel.countDocuments(filter),
      this.enrollmentModel.countDocuments({ courseId }),
    ]);

    const userIds = enrollments.map((e) => e.userId);
    const users = userIds.length
      ? await this.userModel.find({ _id: { $in: userIds } })
      : [];

    const userMap = new Map<string, UserDocument>();
    users.forEach((u) => {
      userMap.set(u._id.toString(), u);
    });

    const data = enrollments
      .map((enrollment) => {
        const user = userMap.get(enrollment.userId);
        if (!user) return null;

        const fullName = user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName;

        return {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          enrollmentId: enrollment._id.toString(),
          enrollmentStatus: enrollment.status,
          progress: enrollment.progress,
          enrolledAt: enrollment.enrolledAt,
          orderId: enrollment.orderId,
          fullName,
        };
      })
      .filter(Boolean);

    return {
      data: data as Array<Record<string, unknown>>,
      total,
      purchasedCount,
      page,
      limit,
    };
  }
}
