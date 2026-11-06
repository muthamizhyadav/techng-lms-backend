import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FreeCoursesStudentService } from './free-courses-student.service';
import { FreeCourse, FreeCourseStatus } from './entities/free-course.entity';
import {
  FreeCourseEnrollment,
  FreeCourseEnrollmentStatus,
} from './entities/free-course-enrollment.entity';

describe('FreeCoursesStudentService', () => {
  let service: FreeCoursesStudentService;

  const mockCourse = {
    _id: 'fc-100',
    id: 'fc-100',
    title: 'Free JS Mastery',
    category: 'Programming',
    status: FreeCourseStatus.PUBLISHED,
    modules: [
      {
        _id: 'm-1',
        title: 'Basics',
        order: 1,
        chapters: [
          {
            _id: 'chap-101',
            title: 'Variables',
            videoUrl: 'https://cdn/free-courses/videos/fc-100/m-1/v1.mp4',
            duration: 300,
            order: 1,
          },
          {
            _id: 'chap-102',
            title: 'Functions',
            videoUrl: 'https://cdn/free-courses/videos/fc-100/m-1/v2.mp4',
            duration: 400,
            order: 2,
          },
        ],
      },
    ],
    attachments: [],
  };

  const mockEnrollment = {
    _id: 'enr-100',
    studentId: 'st-1',
    courseId: 'fc-100',
    status: FreeCourseEnrollmentStatus.ACTIVE,
    progress: 50,
    completedChapters: ['chap-101'],
    chapterProgress: new Map([
      ['chap-101', { completed: true, watchTime: 300, lastPosition: 300 }],
    ]),
    currentChapterId: 'chap-101',
    enrolledAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    markModified: jest.fn(),
  };

  const mockCourseModel: any = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockCourse]),
    findOne: jest.fn().mockResolvedValue(mockCourse),
  };

  const mockEnrollmentModel: any = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockEnrollment]),
    findOne: jest.fn().mockResolvedValue(mockEnrollment),
    create: jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'enr-new',
      save: jest.fn().mockResolvedValue(true),
      markModified: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreeCoursesStudentService,
        {
          provide: getModelToken(FreeCourse.name),
          useValue: mockCourseModel,
        },
        {
          provide: getModelToken(FreeCourseEnrollment.name),
          useValue: mockEnrollmentModel,
        },
      ],
    }).compile();

    service = module.get<FreeCoursesStudentService>(FreeCoursesStudentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyCourses', () => {
    it('should return enrolled courses with progress and pending chapters count', async () => {
      mockEnrollmentModel.exec.mockResolvedValueOnce([mockEnrollment]);
      mockCourseModel.exec.mockResolvedValueOnce([mockCourse]);

      const result = await service.getMyCourses('st-1');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Free JS Mastery');
      expect(result[0].totalChapters).toBe(2);
      expect(result[0].completedChaptersCount).toBe(1);
      expect(result[0].pendingChaptersCount).toBe(1);
    });
  });

  describe('getCourseDetails', () => {
    it('should return course curriculum with individual chapter progress', async () => {
      mockCourseModel.findOne.mockResolvedValueOnce(mockCourse);
      mockEnrollmentModel.findOne.mockResolvedValueOnce(mockEnrollment);

      const result = await service.getCourseDetails('st-1', 'fc-100');
      expect(result.course.id).toBe('fc-100');
      expect(result.course.modules[0].chapters[0].completed).toBe(true);
      expect(result.course.modules[0].chapters[1].completed).toBe(false);
    });
  });

  describe('completeChapter', () => {
    it('should mark chapter complete and recalculate course progress percentage', async () => {
      mockCourseModel.findOne.mockResolvedValueOnce(mockCourse);
      mockEnrollmentModel.findOne.mockResolvedValueOnce(mockEnrollment);

      const result = await service.completeChapter('st-1', 'fc-100', 'chap-102');
      expect(result.success).toBe(true);
      expect(result.completed).toBe(true);
      // Both chap-101 and chap-102 completed => 100%
      expect(result.progress).toBe(100);
      expect(result.status).toBe(FreeCourseEnrollmentStatus.COMPLETED);
    });
  });
});

