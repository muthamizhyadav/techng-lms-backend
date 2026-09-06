import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ArrayUnique,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { CourseStatus } from '../entities/course.entity';

export class ModuleLessonDto {
  @ApiProperty({ example: 'Introduction to Java 21' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'https://r2.dev/lesson-1.mp4' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiPropertyOptional({ example: 720, description: 'Duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ enum: ['video', 'quiz', 'document'], default: 'video' })
  @IsOptional()
  @IsEnum(['video', 'quiz', 'document'])
  type?: 'video' | 'quiz' | 'document';
}

export class ModuleDto {
  @ApiProperty({ example: 'Module 1: Java 21 Core Fundamentals' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ type: [ModuleLessonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleLessonDto)
  lessons?: ModuleLessonDto[];
}

export class CreateCourseDto {
  @ApiProperty({
    example: 'Advanced Web Development',
    description: 'Course title',
  })
  @IsString()
  @MinLength(3, { message: 'Course title must be at least 3 characters' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'Master modern web development with React and Node.js',
    description: 'Course description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'Bola Johnson',
    description: 'Lead instructor name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  instructor?: string;

  @ApiProperty({
    example: 'Web Design',
    description: 'Course category / track',
  })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({
    example: 'draft',
    description: 'Course status',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(CourseStatus, {
    message: 'Status must be draft, published, active, or archived',
  })
  status?: CourseStatus = CourseStatus.DRAFT;

  @ApiPropertyOptional({
    example: 0,
    description: 'Number of enrolled students',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  students?: number = 0;

  @ApiPropertyOptional({
    example: '6 Weeks (24 hours)',
    description: 'Estimated course duration',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string;

  @ApiPropertyOptional({
    example: '12 min 30 sec',
    description: 'Intro / promo video duration (auto-detected on upload)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  videoDuration?: string;

  @ApiPropertyOptional({
    example: 'Beginner',
    description: 'Course difficulty level',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @ApiPropertyOptional({
    example: ['JavaScript', 'React', 'Node.js'],
    description: 'Skills covered',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  skills?: string[];

  @ApiPropertyOptional({ example: 4999, description: 'Course price in INR (minimum ₹1)' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Course price must be at least ₹1' })
  price?: number = 1;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/course.jpg',
    description: 'Course thumbnail URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/course.mp4',
    description: 'Course promo / intro video URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiPropertyOptional({ type: [ModuleDto], description: 'Course curriculum modules with lessons' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDto)
  modules?: ModuleDto[];
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class UpdateCourseStatusDto {
  @ApiProperty({
    example: 'published',
    description: 'New course status',
    enum: CourseStatus,
  })
  @IsEnum(CourseStatus, {
    message: 'Status must be draft, published, active, or archived',
  })
  status: CourseStatus;
}

export class PurchasedUserQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'completed', 'dropped'] })
  @IsOptional()
  @IsString()
  status?: string;
}

@Exclude()
export class PurchasedUserDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  avatar: string;

  @Expose()
  enrollmentId: string;

  @Expose()
  enrollmentStatus: string;

  @Expose()
  progress: number;

  @Expose()
  enrolledAt: Date;

  @Expose()
  orderId: string;
}

@Exclude()
export class PurchasedUsersResponseDto {
  @Expose()
  data: PurchasedUserDto[];

  @Expose()
  total: number;

  @Expose()
  purchasedCount: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;
}

@Exclude()
export class CourseResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  instructor: string;

  @Expose()
  category: string;

  @Expose()
  status: CourseStatus;

  @Expose()
  students: number;

  @Expose()
  duration: string;

  @Expose()
  videoDuration: string;

  @Expose()
  level: string;

  @Expose()
  skills: string[];

  @Expose()
  price: number;

  @Expose()
  thumbnail: string;

  @Expose()
  videoUrl: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
