import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FreeCourse,
  FreeCourseDocument,
  FreeCourseStatus,
} from './entities/free-course.entity';
import {
  FreeCourseEnrollment,
  FreeCourseEnrollmentDocument,
  FreeCourseEnrollmentStatus,
} from './entities/free-course-enrollment.entity';
import { UpdateFreeProgressDto } from './dto/free-progress.dto';

@Injectable()
export class FreeCoursesStudentService {
  constructor(
    @InjectModel(FreeCourse.name)
    private readonly freeCourseModel: Model<FreeCourseDocument>,
    @InjectModel(FreeCourseEnrollment.name)
    private readonly freeCourseEnrollmentModel: Model<FreeCourseEnrollmentDocument>,
  ) {}

  async getMyCourses(studentId: string): Promise<any[]> {
    const enrollments = await this.freeCourseEnrollmentModel
      .find({ studentId })
      .sort({ updatedAt: -1 })
      .exec();

    if (enrollments.length === 0) {
      return [];
    }

    const courseIds = enrollments.map((e) => e.courseId);
    const courses = await this.freeCourseModel
      .find({
        _id: { $in: courseIds },
        deletedAt: null,
      })
      .exec();

    const courseMap = new Map(courses.map((c) => [c.id || c._id, c]));

    return enrollments
      .map((enrollment) => {
        const course = courseMap.get(enrollment.courseId);
        if (!course) return null;

        // Count total chapters across all modules
        let totalChapters = 0;
        let firstChapterId: string | null = null;
        for (const mod of course.modules || []) {
          for (const chap of mod.chapters || []) {
            totalChapters++;
            if (!firstChapterId) {
              firstChapterId = chap._id;
            }
          }
        }

        const completedCount = (enrollment.completedChapters || []).length;
        const pendingCount = Math.max(0, totalChapters - completedCount);

        return {
          enrollmentId: enrollment._id,
          courseId: course._id,
          title: course.title,
          description: course.description,
          instructor: course.instructor,
          category: course.category,
          level: course.level,
          duration: course.duration,
          videoDuration: course.videoDuration,
          thumbnail: course.thumbnail,
          banner: course.banner,
          progress: enrollment.progress || 0,
          status: enrollment.status,
          totalChapters,
          completedChaptersCount: completedCount,
          pendingChaptersCount: pendingCount,
          currentChapterId:
            enrollment.currentChapterId || firstChapterId || null,
          attachmentsCount: (course.attachments || []).length,
          attachments: course.attachments || [],
          enrolledAt: enrollment.enrolledAt,
          updatedAt: enrollment.updatedAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async getAvailableCourses(studentId: string): Promise<any[]> {
    // Only courses specifically assigned to this student are accessible
    const enrollments = await this.freeCourseEnrollmentModel
      .find({ studentId })
      .select('courseId status progress')
      .exec();

    if (enrollments.length === 0) {
      return [];
    }

    const assignedCourseIds = enrollments.map((e) => e.courseId);
    const courses = await this.freeCourseModel
      .find({
        _id: { $in: assignedCourseIds },
        status: { $in: [FreeCourseStatus.PUBLISHED, FreeCourseStatus.ACTIVE] },
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .exec();

    const enrollmentMap = new Map(
      enrollments.map((e) => [e.courseId, e]),
    );

    return courses.map((course) => {
      const enrollment = enrollmentMap.get(course.id || course._id);
      let totalChapters = 0;
      for (const mod of course.modules || []) {
        totalChapters += (mod.chapters || []).length;
      }

      return {
        id: course._id,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        trainerId: course.trainerId || null,
        trainerName: course.trainerName || course.instructor,
        trainerDesignation: course.trainerDesignation || null,
        trainerAvatar: course.trainerAvatar || null,
        trainerBio: course.trainerBio || null,
        category: course.category,
        level: course.level,
        duration: course.duration,
        videoDuration: course.videoDuration,
        skills: course.skills,
        thumbnail: course.thumbnail,
        banner: course.banner,
        totalChapters,
        attachmentsCount: (course.attachments || []).length,
        isEnrolled: !!enrollment,
        enrollmentId: enrollment?._id || null,
        progress: enrollment?.progress || 0,
      };
    });
  }

  async getCourseDetails(studentId: string, courseId: string): Promise<any> {
    const course = await this.freeCourseModel.findOne({
      _id: courseId,
      deletedAt: null,
    });

    if (!course) {
      throw new NotFoundException(`Free Course with ID "${courseId}" not found`);
    }

    // Strict Access Control: Free courses require explicit Admin assignment
    const enrollment = await this.freeCourseEnrollmentModel.findOne({
      studentId,
      courseId,
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Access Denied: You do not have access to this free course. Free courses are restricted and must be specifically assigned to your account by TechNG Administration.',
      );
    }

    const chapterProgressMap = enrollment
      ? enrollment.chapterProgress || new Map()
      : new Map();
    const completedSet = new Set(enrollment?.completedChapters || []);

    let totalChapters = 0;
    const modulesWithProgress = (course.modules || []).map((mod) => {
      const chapters = (mod.chapters || []).map((chap) => {
        totalChapters++;
        const prog = chapterProgressMap instanceof Map
          ? chapterProgressMap.get(chap._id)
          : (chapterProgressMap as any)?.[chap._id];

        const isCompleted = completedSet.has(chap._id) || !!prog?.completed;

        return {
          _id: chap._id,
          title: chap.title,
          videoUrl: chap.videoUrl,
          duration: chap.duration || 0,
          order: chap.order,
          type: chap.type || 'video',
          documentUrl: chap.documentUrl,
          attachments: chap.attachments || [],
          completed: isCompleted,
          watchTime: prog?.watchTime || 0,
          lastPosition: prog?.lastPosition || 0,
        };
      });

      return {
        _id: mod._id,
        title: mod.title,
        order: mod.order,
        thumbnail: mod.thumbnail,
        chapters,
      };
    });

    return {
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        category: course.category,
        level: course.level,
        duration: course.duration,
        videoDuration: course.videoDuration,
        skills: course.skills,
        thumbnail: course.thumbnail,
        banner: course.banner,
        attachments: course.attachments || [],
        modules: modulesWithProgress,
      },
      enrollment: enrollment
        ? {
            id: enrollment._id,
            progress: enrollment.progress,
            status: enrollment.status,
            completedChapters: enrollment.completedChapters,
            currentChapterId: enrollment.currentChapterId,
            enrolledAt: enrollment.enrolledAt,
          }
        : null,
      totalChapters,
      completedChaptersCount: completedSet.size,
      pendingChaptersCount: Math.max(0, totalChapters - completedSet.size),
    };
  }

  async updateProgress(
    studentId: string,
    courseId: string,
    dto: UpdateFreeProgressDto,
  ): Promise<any> {
    const enrollment = await this.freeCourseEnrollmentModel.findOne({
      studentId,
      courseId,
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Access Denied: You do not have access to this free course. Free courses require admin assignment.',
      );
    }

    const { chapterId, watchTime, lastPosition } = dto;

    const existingProgress =
      enrollment.chapterProgress instanceof Map
        ? enrollment.chapterProgress.get(chapterId)
        : (enrollment.chapterProgress as any)?.[chapterId];

    const isCompleted =
      existingProgress?.completed ||
      (enrollment.completedChapters || []).includes(chapterId);

    const updatedData = {
      completed: isCompleted,
      watchTime: Math.max(watchTime || 0, existingProgress?.watchTime || 0),
      lastPosition: lastPosition || 0,
      completedAt: existingProgress?.completedAt || null,
    };

    if (enrollment.chapterProgress instanceof Map) {
      enrollment.chapterProgress.set(chapterId, updatedData);
    } else {
      (enrollment.chapterProgress as any)[chapterId] = updatedData;
    }

    enrollment.currentChapterId = chapterId;
    enrollment.markModified('chapterProgress');
    await enrollment.save();

    return {
      success: true,
      chapterId,
      watchTime: updatedData.watchTime,
      lastPosition: updatedData.lastPosition,
      completed: updatedData.completed,
    };
  }

  async completeChapter(
    studentId: string,
    courseId: string,
    chapterId: string,
  ): Promise<any> {
    const course = await this.freeCourseModel.findOne({
      _id: courseId,
      deletedAt: null,
    });
    if (!course) {
      throw new NotFoundException(`Free Course with ID "${courseId}" not found`);
    }

    const enrollment = await this.freeCourseEnrollmentModel.findOne({
      studentId,
      courseId,
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Access Denied: You do not have access to this free course. Free courses require admin assignment.',
      );
    }

    const completedSet = new Set(enrollment.completedChapters || []);
    completedSet.add(chapterId);
    enrollment.completedChapters = Array.from(completedSet);

    // Update chapter progress
    const existingProgress =
      enrollment.chapterProgress instanceof Map
        ? enrollment.chapterProgress.get(chapterId)
        : (enrollment.chapterProgress as any)?.[chapterId];

    const updatedData = {
      completed: true,
      watchTime: existingProgress?.watchTime || 0,
      lastPosition: existingProgress?.lastPosition || 0,
      completedAt: existingProgress?.completedAt || new Date(),
    };

    if (enrollment.chapterProgress instanceof Map) {
      enrollment.chapterProgress.set(chapterId, updatedData);
    } else {
      (enrollment.chapterProgress as any)[chapterId] = updatedData;
    }

    // Compute total chapters count
    let totalChapters = 0;
    for (const mod of course.modules || []) {
      totalChapters += (mod.chapters || []).length;
    }

    const completedCount = enrollment.completedChapters.length;
    const progress =
      totalChapters > 0
        ? Math.min(100, Math.round((completedCount / totalChapters) * 100))
        : 100;

    enrollment.progress = progress;
    if (progress >= 100) {
      enrollment.status = FreeCourseEnrollmentStatus.COMPLETED;
    }

    enrollment.currentChapterId = chapterId;
    enrollment.markModified('chapterProgress');
    await enrollment.save();

    return {
      success: true,
      chapterId,
      completed: true,
      progress,
      completedChaptersCount: completedCount,
      totalChapters,
      status: enrollment.status,
    };
  }
}

