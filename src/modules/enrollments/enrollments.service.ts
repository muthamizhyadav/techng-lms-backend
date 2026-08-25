import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentStatus,
} from './entities/enrollment.entity';
import { Course, CourseDocument } from '../courses/entities/course.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
  ) {}

  async enrollUserInCourse(
    userId: string,
    courseId: string,
    orderId: string,
  ): Promise<Enrollment> {
    const existing = await this.enrollmentModel.findOne({ userId, courseId });
    if (existing) {
      return existing.toJSON();
    }

    const enrollment = await this.enrollmentModel.create({
      userId,
      courseId,
      orderId,
      status: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
    });

    // Increment enrolled student count on course
    await this.courseModel.updateOne(
      { _id: courseId },
      { $inc: { students: 1 } },
    );

    return enrollment.toJSON();
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const count = await this.enrollmentModel.countDocuments({
      userId,
      courseId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    });
    return count > 0;
  }

  async getMyEnrolledCourses(userId: string) {
    const enrollments = await this.enrollmentModel
      .find({ userId })
      .sort({ enrolledAt: -1 })
      .exec();

    const courseIds = enrollments.map((e) => e.courseId);
    const courses = await this.courseModel.find({
      _id: { $in: courseIds },
      deletedAt: null,
    });

    const courseMap = new Map<string, CourseDocument>();
    courses.forEach((c) => {
      courseMap.set(c._id.toString(), c);
    });

    return enrollments
      .map((enrollment) => {
        const course = courseMap.get(enrollment.courseId);
        if (!course) return null;
        return {
          enrollmentId: enrollment._id.toString(),
          status: enrollment.status,
          progress: enrollment.progress,
          enrolledAt: enrollment.enrolledAt,
          course: {
            id: course._id.toString(),
            title: course.title,
            description: course.description,
            instructor: course.instructor,
            category: course.category,
            duration: course.duration,
            level: course.level,
            thumbnail: course.thumbnail,
            videoUrl: course.videoUrl,
            skills: course.skills,
          },
        };
      })
      .filter(Boolean);
  }

  async getCurriculum(userId: string, enrollmentId: string) {
    const enrollment = await this.enrollmentModel.findOne({
      _id: enrollmentId,
      userId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const course = await this.courseModel.findOne({
      _id: enrollment.courseId,
      deletedAt: null,
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lessonProgressObj: Record<string, any> = {};
    if (enrollment.lessonProgress) {
      enrollment.lessonProgress.forEach((value, key) => {
        lessonProgressObj[key] = value;
      });
    }

    return {
      enrollmentId: enrollment._id.toString(),
      courseId: course._id.toString(),
      courseTitle: course.title,
      modules: course.modules || [],
      lessonProgress: lessonProgressObj,
      currentLessonId: enrollment.currentLessonId || null,
      overallProgress: enrollment.progress,
    };
  }

  async updateProgress(userId: string, enrollmentId: string, dto: UpdateProgressDto) {
    const enrollment = await this.enrollmentModel.findOne({
      _id: enrollmentId,
      userId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const updateFields: Record<string, any> = {};
    updateFields[`lessonProgress.${dto.lessonId}.watchTime`] = dto.watchTime;
    updateFields[`lessonProgress.${dto.lessonId}.lastPosition`] = dto.lastPosition;
    updateFields.currentLessonId = dto.lessonId;

    await this.enrollmentModel.updateOne({ _id: enrollmentId }, { $set: updateFields });

    return { success: true };
  }

  async completeLesson(userId: string, enrollmentId: string, lessonId: string) {
    const enrollment = await this.enrollmentModel.findOne({
      _id: enrollmentId,
      userId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const course = await this.courseModel.findOne({
      _id: enrollment.courseId,
      deletedAt: null,
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const updateFields: Record<string, any> = {};
    updateFields[`lessonProgress.${lessonId}.completed`] = true;
    updateFields[`lessonProgress.${lessonId}.completedAt`] = new Date();

    const allLessonIds: string[] = [];
    for (const mod of course.modules || []) {
      for (const lesson of mod.lessons || []) {
        allLessonIds.push(lesson._id?.toString() || '');
      }
    }

    const progress = await this.enrollmentModel.findOne({ _id: enrollmentId });
    const currentCompleted = new Set<string>();
    if (progress?.lessonProgress) {
      progress.lessonProgress.forEach((val: any, key: string) => {
        if (val.completed) currentCompleted.add(key);
      });
    }
    currentCompleted.add(lessonId);

    const totalLessons = allLessonIds.length || 1;
    const completedCount = currentCompleted.size;
    const overallProgress = Math.min(Math.round((completedCount / totalLessons) * 100), 100);

    updateFields.progress = overallProgress;

    if (overallProgress >= 100) {
      updateFields.status = EnrollmentStatus.COMPLETED;
    }

    await this.enrollmentModel.updateOne({ _id: enrollmentId }, { $set: updateFields });

    let nextLessonId: string | null = null;
    let foundCurrent = false;
    for (const mod of course.modules || []) {
      for (const lesson of mod.lessons || []) {
        const lid = lesson._id?.toString() || '';
        if (foundCurrent && !currentCompleted.has(lid)) {
          nextLessonId = lid;
          break;
        }
        if (lid === lessonId) {
          foundCurrent = true;
        }
      }
      if (nextLessonId) break;
    }

    return {
      success: true,
      progress: overallProgress,
      nextLessonId,
      completed: overallProgress >= 100,
    };
  }
}
