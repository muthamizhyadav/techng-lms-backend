import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CourseCategory,
  CourseCategoryDocument,
} from './entities/course-category.entity';
import {
  CreateCourseCategoryDto,
  UpdateCourseCategoryDto,
} from './dto/course-category.dto';
import {
  Course,
  CourseDocument,
} from '@modules/courses/entities/course.entity';

export interface CourseCategoryQuery {
  page: number;
  limit: number;
  isActive?: boolean;
  search?: string;
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class CourseCategoriesService {
  constructor(
    @InjectModel(CourseCategory.name)
    private readonly categoryModel: Model<CourseCategoryDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
  ) {}

  private slugify(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<string> {
    const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
    let candidate = slug;

    let exists = await this.categoryModel.findOne({
      slug: candidate,
      ...exclude,
      deletedAt: null,
    });

    while (exists) {
      candidate = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      exists = await this.categoryModel.findOne({
        slug: candidate,
        ...exclude,
        deletedAt: null,
      });
    }

    return candidate;
  }

  private async assertValidParent(parentId?: string): Promise<void> {
    if (!parentId) return;

    const parent = await this.categoryModel.findOne({
      _id: parentId,
      deletedAt: null,
    });

    if (!parent) {
      throw new BadRequestException(
        `Parent category with ID "${parentId}" not found`,
      );
    }
  }

  private async attachCourseCounts(
    categories: CourseCategoryDocument[],
  ): Promise<Array<CourseCategory & { coursesCount: number }>> {
    if (categories.length === 0) return [];

    const names = categories.map((category) => category.name);

    const counts = await this.courseModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: { category: { $in: names }, deletedAt: null } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((count) => [count._id, count.count]));

    return categories.map((category) => {
      const json = category.toJSON();
      return {
        ...json,
        coursesCount: countMap.get(category.name) ?? 0,
      };
    });
  }

  async findAll(query: CourseCategoryQuery): Promise<{
    data: Array<CourseCategory & { coursesCount: number }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, isActive, search } = query;

    const filter: Record<string, unknown> = { deletedAt: null };

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { description: regex }];
    }

    const [data, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(filter),
    ]);

    const decorated = await this.attachCourseCounts(data);

    return { data: decorated, total, page, limit };
  }

  async findOne(
    id: string,
  ): Promise<
    CourseCategory & { coursesCount: number; subCategoriesCount: number }
  > {
    const category = await this.categoryModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    const [coursesCount, subCategoriesCount] = await Promise.all([
      this.courseModel.countDocuments({
        category: category.name,
        deletedAt: null,
      }),
      this.categoryModel.countDocuments({
        parentId: id,
        deletedAt: null,
      }),
    ]);

    return {
      ...category.toJSON(),
      coursesCount,
      subCategoriesCount,
    };
  }

  async create(
    dto: CreateCourseCategoryDto,
    adminId: string,
  ): Promise<CourseCategory> {
    const nameRegex = new RegExp(`^${escapeRegex(dto.name.trim())}$`, 'i');

    const duplicate = await this.categoryModel.findOne({
      name: nameRegex,
      deletedAt: null,
    });

    if (duplicate) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    await this.assertValidParent(dto.parentId);

    const baseSlug = dto.slug?.trim().toLowerCase() || this.slugify(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const savedCategory = await this.categoryModel.create({
      ...dto,
      name: dto.name.trim(),
      slug,
      createdByAdminId: adminId,
      updatedByAdminId: adminId,
    });

    return savedCategory.toJSON();
  }

  async update(
    id: string,
    dto: UpdateCourseCategoryDto,
    adminId: string,
  ): Promise<CourseCategory> {
    const category = await this.findOne(id);

    if (dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    if (
      dto.name &&
      dto.name.trim().toLowerCase() !== category.name.trim().toLowerCase()
    ) {
      const nameRegex = new RegExp(`^${escapeRegex(dto.name.trim())}$`, 'i');
      const duplicate = await this.categoryModel.findOne({
        name: nameRegex,
        _id: { $ne: id },
        deletedAt: null,
      });

      if (duplicate) {
        throw new ConflictException(`Category "${dto.name}" already exists`);
      }
    }

    await this.assertValidParent(dto.parentId);

    const payload: Partial<CreateCourseCategoryDto> & {
      updatedByAdminId: string;
    } = { ...dto, updatedByAdminId: adminId };

    if (dto.name) {
      payload.name = dto.name.trim();

      const nameChanged =
        dto.name.trim().toLowerCase() !== category.name.trim().toLowerCase();
      const shouldReslug = nameChanged && !dto.slug;

      if (shouldReslug) {
        payload.slug = await this.ensureUniqueSlug(this.slugify(dto.name), id);
      }
    }

    const updatedCategory = await this.categoryModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      payload,
      { new: true },
    );

    return updatedCategory.toJSON();
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    const subCategories = await this.categoryModel.countDocuments({
      parentId: id,
      deletedAt: null,
    });

    if (subCategories > 0) {
      throw new ConflictException(
        'Cannot delete a category that has subcategories',
      );
    }

    if (category.coursesCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that has courses assigned to it',
      );
    }

    await this.categoryModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
    );
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    parentCategories: number;
    subCategories: number;
    totalCourses: number;
  }> {
    const [
      total,
      active,
      inactive,
      parentCategories,
      subCategories,
      totalCourses,
    ] = await Promise.all([
      this.categoryModel.countDocuments({ deletedAt: null }),
      this.categoryModel.countDocuments({ deletedAt: null, isActive: true }),
      this.categoryModel.countDocuments({ deletedAt: null, isActive: false }),
      this.categoryModel.countDocuments({ deletedAt: null, parentId: null }),
      this.categoryModel.countDocuments({
        deletedAt: null,
        parentId: { $ne: null },
      }),
      this.courseModel.aggregate<{ count: number }>([
        { $match: { deletedAt: null } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      active,
      inactive,
      parentCategories,
      subCategories,
      totalCourses: totalCourses[0]?.count ?? 0,
    };
  }
}
