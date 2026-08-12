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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { CourseStatus } from '../entities/course.entity';

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

  @ApiPropertyOptional({ example: 4999, description: 'Course price in INR' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number = 0;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/course.jpg',
    description: 'Course thumbnail URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;
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
  level: string;

  @Expose()
  skills: string[];

  @Expose()
  price: number;

  @Expose()
  thumbnail: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
