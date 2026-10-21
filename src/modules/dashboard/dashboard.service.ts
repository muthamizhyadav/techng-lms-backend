import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@modules/users/entities/user.entity';
import {
  Course,
  CourseDocument,
  CourseStatus,
} from '@modules/courses/entities/course.entity';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentStatus,
} from '@modules/enrollments/entities/enrollment.entity';
import { UserStatus } from '@shared/enums/role.enum';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_LENGTH = 7;

export type ReportStatus = 'Completed' | 'In Progress' | 'At Risk';

export interface WeeklyEngagementPoint {
  day: string;
  date: string;
  enrollments: number;
  completions: number;
}

export interface TopCourse {
  id: string;
  title: string;
  category: string;
  level: string;
  progress: number;
  students: number;
}

export interface RecentEnrollment {
  id: string;
  studentName: string;
  email: string;
  courseTitle: string;
  enrolledAt: string;
}

export interface StudentReport {
  id: string;
  studentName: string;
  email: string;
  course: string;
  progress: number;
  status: ReportStatus;
  lastActive: string | null;
}

export interface DashboardOverview {
  stats: {
    totalCourses: number;
    activeCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalCategories: number;
    totalStudents: number;
    enrolledStudents: number;
    activeStudents: number;
    pendingStudents: number;
    totalEnrollments: number;
    completedEnrollments: number;
    enrollmentsThisWeek: number;
    avgCompletionRate: number;
  };
  weeklyEngagement: WeeklyEngagementPoint[];
  topCourses: TopCourse[];
  recentEnrollments: RecentEnrollment[];
  studentReports: StudentReport[];
  generatedAt: string;
}

function utcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  async getOverview(): Promise<DashboardOverview> {
    const today = startOfUtcDay(new Date());
    const weekDays: Array<{ date: Date; key: string; label: string }> = [];

    for (let offset = WEEK_LENGTH - 1; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - offset);
      weekDays.push({
        date,
        key: utcDateKey(date),
        label: DAY_LABELS[date.getUTCDay()],
      });
    }

    const weekStart = weekDays[0].date;

    const [
      totalCourses,
      activeCourses,
      publishedCourses,
      draftCourses,
      categories,
      totalStudents,
      enrolledUserIds,
      activeStudents,
      pendingStudents,
      totalEnrollments,
      completedEnrollments,
      completionAgg,
      enrollmentSeries,
      completionSeries,
      courses,
      recentEnrollments,
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
      this.courseModel.distinct('category', { deletedAt: null }),
      this.userModel.countDocuments({ deletedAt: null }),
      this.enrollmentModel.distinct('userId'),
      this.userModel.countDocuments({
        status: UserStatus.ACTIVE,
        deletedAt: null,
      }),
      this.userModel.countDocuments({
        status: UserStatus.PENDING,
        deletedAt: null,
      }),
      this.enrollmentModel.countDocuments({}),
      this.enrollmentModel.countDocuments({
        status: EnrollmentStatus.COMPLETED,
      }),
      this.enrollmentModel.aggregate<{ avgProgress: number }>([
        { $group: { _id: null, avgProgress: { $avg: '$progress' } } },
      ]),
      this.enrollmentModel.aggregate<{ _id: string; count: number }>([
        { $match: { enrolledAt: { $gte: weekStart } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      this.enrollmentModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            status: EnrollmentStatus.COMPLETED,
            updatedAt: { $gte: weekStart },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      this.courseModel
        .find({ deletedAt: null })
        .select('title category level students')
        .sort({ students: -1 })
        .limit(4)
        .lean()
        .exec(),
      this.enrollmentModel
        .find({})
        .sort({ enrolledAt: -1 })
        .limit(6)
        .lean()
        .exec(),
    ]);

    const enrollmentByDay = new Map(
      enrollmentSeries.map((row) => [row._id, row.count]),
    );
    const completionByDay = new Map(
      completionSeries.map((row) => [row._id, row.count]),
    );

    const weeklyEngagement: WeeklyEngagementPoint[] = weekDays.map((day) => ({
      day: day.label,
      date: day.key,
      enrollments: enrollmentByDay.get(day.key) ?? 0,
      completions: completionByDay.get(day.key) ?? 0,
    }));

    const enrollmentsThisWeek = weeklyEngagement.reduce(
      (sum, point) => sum + point.enrollments,
      0,
    );

    const courseIds = courses.map((course) => course._id.toString());
    const progressRows = courseIds.length
      ? await this.enrollmentModel.aggregate<{
          _id: string;
          avgProgress: number;
        }>([
          { $match: { courseId: { $in: courseIds } } },
          {
            $group: {
              _id: '$courseId',
              avgProgress: { $avg: '$progress' },
            },
          },
        ])
      : [];

    const progressByCourse = new Map(
      progressRows.map((row) => [row._id, row.avgProgress]),
    );

    const topCourses: TopCourse[] = courses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      category: course.category,
      level: course.level || 'General',
      progress: Math.round(progressByCourse.get(course._id.toString()) ?? 0),
      students: course.students ?? 0,
    }));

    const studentIds = [
      ...new Set(recentEnrollments.map((item) => item.userId)),
    ];
    const relatedCourseIds = [
      ...new Set(recentEnrollments.map((item) => item.courseId)),
    ];

    const [users, relatedCourses] = await Promise.all([
      this.userModel
        .find({ _id: { $in: studentIds } })
        .select('firstName lastName email lastLoginAt')
        .lean()
        .exec(),
      this.courseModel
        .find({ _id: { $in: relatedCourseIds } })
        .select('title')
        .lean()
        .exec(),
    ]);

    const userById = new Map(users.map((user) => [user._id.toString(), user]));
    const courseById = new Map(
      relatedCourses.map((course) => [course._id.toString(), course]),
    );

    const studentName = (userId: string): string => {
      const user = userById.get(userId);
      if (!user) return 'Unknown student';
      return user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName;
    };

    const recentEnrollmentRows: RecentEnrollment[] = recentEnrollments
      .slice(0, 5)
      .map((item) => ({
        id: item._id.toString(),
        studentName: studentName(item.userId),
        email: userById.get(item.userId)?.email ?? '',
        courseTitle: courseById.get(item.courseId)?.title ?? 'Unknown course',
        enrolledAt: new Date(item.enrolledAt).toISOString(),
      }));

    const studentReports: StudentReport[] = recentEnrollments.map((item) => {
      const user = userById.get(item.userId);
      const progress = Math.round(item.progress ?? 0);
      let status: ReportStatus = 'In Progress';

      if (item.status === EnrollmentStatus.COMPLETED || progress >= 100) {
        status = 'Completed';
      } else if (progress < 40) {
        status = 'At Risk';
      }

      const lastActiveAt =
        user?.lastLoginAt ?? item.updatedAt ?? item.enrolledAt;

      return {
        id: item._id.toString(),
        studentName: studentName(item.userId),
        email: user?.email ?? '',
        course: courseById.get(item.courseId)?.title ?? 'Unknown course',
        progress,
        status,
        lastActive: lastActiveAt ? new Date(lastActiveAt).toISOString() : null,
      };
    });

    return {
      stats: {
        totalCourses,
        activeCourses,
        publishedCourses,
        draftCourses,
        totalCategories: categories.length,
        totalStudents,
        enrolledStudents: enrolledUserIds.length,
        activeStudents,
        pendingStudents,
        totalEnrollments,
        completedEnrollments,
        enrollmentsThisWeek,
        avgCompletionRate: Math.round(completionAgg[0]?.avgProgress ?? 0),
      },
      weeklyEngagement,
      topCourses,
      recentEnrollments: recentEnrollmentRows,
      studentReports,
      generatedAt: new Date().toISOString(),
    };
  }
}
