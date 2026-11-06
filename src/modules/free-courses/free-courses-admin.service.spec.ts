import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FreeCoursesAdminService } from './free-courses-admin.service';
import { FreeCourse, FreeCourseStatus } from './entities/free-course.entity';
import { FreeCourseTrainer } from './entities/free-course-trainer.entity';
import {
  FreeCourseEnrollment,
  FreeCourseEnrollmentStatus,
} from './entities/free-course-enrollment.entity';
import { User } from '@modules/users/entities/user.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('FreeCoursesAdminService', () => {
  let service: FreeCoursesAdminService;

  const mockFreeCourse = {
    _id: 'fc-123',
    id: 'fc-123',
    title: 'Free Python Bootcamp',
    description: 'Learn Python for free',
    instructor: 'Jane Doe',
    category: 'Programming',
    status: FreeCourseStatus.PUBLISHED,
    level: 'Beginner',
    duration: '2 hours',
    videoDuration: '02:00:00',
    skills: ['Python'],
    thumbnail: 'free-courses/thumbnails/thumb.jpg',
    banner: 'free-courses/banners/banner.jpg',
    attachments: [],
    modules: [
      {
        _id: 'mod-1',
        title: 'Module 1',
        order: 1,
        chapters: [
          {
            _id: 'chap-1',
            title: 'Lesson 1',
            videoUrl: 'https://cdn/free-courses/videos/fc-123/mod-1/video.mp4',
            duration: 120,
            order: 1,
            type: 'video',
          },
        ],
      },
    ],
    students: 1,
    toJSON: function () {
      return this;
    },
  };

  const mockCourseModel: any = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockFreeCourse]),
    countDocuments: jest.fn().mockResolvedValue(1),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'fc-created',
      id: 'fc-created',
      toJSON: () => ({ ...dto, id: 'fc-created' }),
    })),
    findOneAndUpdate: jest.fn().mockResolvedValue(mockFreeCourse),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockFreeCourse),
    distinct: jest.fn().mockResolvedValue(['Programming']),
  };

  const mockEnrollmentModel: any = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(1),
    create: jest.fn().mockImplementation((dto) => ({ ...dto, _id: 'enr-1' })),
    findOne: jest.fn(),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };

  const mockUserModel: any = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'user-123',
      id: 'user-123',
      toJSON: () => ({ ...dto, id: 'user-123' }),
    })),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOneAndUpdate: jest.fn().mockResolvedValue({
      _id: 'user-123',
      id: 'user-123',
      toJSON: () => ({ id: 'user-123' }),
    }),
  };

  const mockTrainerModel: any = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(1),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'trainer-1',
      id: 'trainer-1',
      toJSON: () => ({ ...dto, id: 'trainer-1' }),
    })),
    findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'trainer-1', toJSON: () => ({ id: 'trainer-1' }) }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreeCoursesAdminService,
        {
          provide: getModelToken(FreeCourse.name),
          useValue: mockCourseModel,
        },
        {
          provide: getModelToken(FreeCourseTrainer.name),
          useValue: mockTrainerModel,
        },
        {
          provide: getModelToken(FreeCourseEnrollment.name),
          useValue: mockEnrollmentModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<FreeCoursesAdminService>(FreeCoursesAdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated free courses', async () => {
      mockCourseModel.exec.mockResolvedValueOnce([mockFreeCourse]);
      mockCourseModel.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a course when found', async () => {
      mockCourseModel.findOne.mockResolvedValueOnce(mockFreeCourse);

      const result = await service.findOne('fc-123');
      expect(result._id).toBe('fc-123');
    });

    it('should throw NotFoundException when course not found', async () => {
      mockCourseModel.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a free course with module IDs', async () => {
      const dto = {
        title: 'New Free Course',
        category: 'Web',
        modules: [
          {
            title: 'Intro',
            order: 1,
            chapters: [
              {
                title: 'First Step',
                order: 1,
                videoUrl: 'free-courses/videos/fc-1/mod-1/step.mp4',
              },
            ],
          },
        ],
      };

      const result = await service.create(dto as any, 'admin-1');
      expect(result.title).toBe('New Free Course');
      expect(mockCourseModel.create).toHaveBeenCalled();
    });
  });

  describe('createStudent', () => {
    it('should create student account with free_student role and credentials', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null); // No duplicate email

      const dto = {
        firstName: 'Free',
        lastName: 'Student',
        email: 'freestudent@example.com',
        password: 'Pass123456!',
        phone: '+919876543210',
        courseIds: ['fc-123'],
      };

      mockCourseModel.find.mockResolvedValueOnce([mockFreeCourse]);

      const result = await service.createStudent(dto, 'admin-1');
      expect(result.credentials.email).toBe('freestudent@example.com');
      expect(result.credentials.temporaryPassword).toBe('Pass123456!');
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(mockEnrollmentModel.create).toHaveBeenCalled();
      expect(mockCourseModel.findByIdAndUpdate).toHaveBeenCalledWith('fc-123', {
        $inc: { students: 1 },
      });
    });

    it('should throw ConflictException if student email already exists', async () => {
      mockUserModel.findOne.mockResolvedValueOnce({ _id: 'existing-user' });

      await expect(
        service.createStudent(
          {
            firstName: 'Dup',
            email: 'duplicate@example.com',
            password: 'Pass',
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats for free courses', async () => {
      mockCourseModel.countDocuments.mockResolvedValue(5);
      mockEnrollmentModel.countDocuments.mockResolvedValue(25);
      mockCourseModel.distinct.mockResolvedValue(['Web', 'AI']);

      const stats = await service.getStats();
      expect(stats.total).toBe(5);
      expect(stats.categories).toBe(2);
      expect(stats.totalStudents).toBe(25);
    });
  });
});

