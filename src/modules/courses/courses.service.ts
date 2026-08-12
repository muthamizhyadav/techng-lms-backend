import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument, CourseStatus } from './entities/course.entity';
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
}
