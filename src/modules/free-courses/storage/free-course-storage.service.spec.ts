import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { FreeCourseStorageService } from './free-course-storage.service';

describe('FreeCourseStorageService', () => {
  let service: FreeCourseStorageService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'storage.endpoint':
          return 'https://r2.example.com';
        case 'storage.accessKeyId':
          return 'mock-access';
        case 'storage.secretAccessKey':
          return 'mock-secret';
        case 'storage.bucketName':
          return 'techng-lms';
        case 'storage.publicBaseUrl':
          return 'https://pub.example.com';
        case 'storage.maxVideoSizeMb':
          return 4096;
        case 'storage.maxThumbnailSizeMb':
          return 10;
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreeCourseStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FreeCourseStorageService>(FreeCourseStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('S3 Bucket Folder Structure (Requirement 7)', () => {
    it('should generate free-courses/thumbnails/ key for thumbnail purpose', () => {
      const key = service.buildKey('thumbnail', 'python-thumbnail.png');
      expect(key).toMatch(/^free-courses\/thumbnails\/[a-f0-9-]+-python-thumbnail\.png$/);
    });

    it('should generate free-courses/banners/ key for banner purpose', () => {
      const key = service.buildKey('banner', 'hero-banner.jpg');
      expect(key).toMatch(/^free-courses\/banners\/[a-f0-9-]+-hero-banner\.jpg$/);
    });

    it('should generate free-courses/videos/{courseId}/{moduleId}/ key for video purpose', () => {
      const key = service.buildKey('video', 'intro-lesson.mp4', 'course-123', 'module-456');
      expect(key).toMatch(
        /^free-courses\/videos\/course-123\/module-456\/[a-f0-9-]+-intro-lesson\.mp4$/,
      );
    });

    it('should generate free-courses/documents/{courseId}/ key for document purpose', () => {
      const key = service.buildKey('document', 'cheat-sheet.pdf', 'course-123');
      expect(key).toMatch(/^free-courses\/documents\/course-123\/[a-f0-9-]+-cheat-sheet\.pdf$/);
    });

    it('should generate free-courses/attachments/{courseId}/ key for attachment purpose', () => {
      const key = service.buildKey('attachment', 'resources.zip', 'course-123');
      expect(key).toMatch(/^free-courses\/attachments\/course-123\/[a-f0-9-]+-resources\.zip$/);
    });

    it('should generate public URL correctly using publicBaseUrl', () => {
      const key = 'free-courses/videos/c1/m1/video.mp4';
      const url = service.getPublicUrl(key);
      expect(url).toBe('https://pub.example.com/free-courses/videos/c1/m1/video.mp4');
    });
  });

  describe('validateFile', () => {
    it('should allow valid video mime types', () => {
      expect(() => {
        service.validateFile('video', 'video/mp4', 10 * 1024 * 1024);
      }).not.toThrow();
    });

    it('should reject invalid video mime types', () => {
      expect(() => {
        service.validateFile('video', 'application/x-exe', 100);
      }).toThrow(BadRequestException);
    });

    it('should reject files exceeding max size limit', () => {
      expect(() => {
        // Thumbnail max is 10 MB = 10485760 bytes
        service.validateFile('thumbnail', 'image/png', 20 * 1024 * 1024);
      }).toThrow(BadRequestException);
    });
  });
});

