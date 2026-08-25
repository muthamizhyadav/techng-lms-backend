import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentStatus,
} from './entities/enrollment.entity';
import { Course, CourseDocument } from '../courses/entities/course.entity';

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
}
