import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class CreateCourseCategoryDto {
  @ApiProperty({
    example: 'Web Design',
    description: 'Category name',
  })
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'web-design',
    description: 'URL-friendly slug. Auto-generated from the name when omitted',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({
    example: 'Courses covering visual design, UI/UX and branding',
    description: 'Short category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: '🎨',
    description: 'Icon (emoji or icon key) displayed on the UI',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/categories/web-design.jpg',
    description: 'Category thumbnail / cover image URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Parent category UUID when creating a subcategory',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: 1, default: 0, description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourseCategoryDto extends PartialType(
  CreateCourseCategoryDto,
) {}

@Exclude()
export class CourseCategoryResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  @Expose()
  icon: string;

  @Expose()
  thumbnail: string;

  @Expose()
  parentId: string;

  @Expose()
  sortOrder: number;

  @Expose()
  isActive: boolean;

  @Expose()
  coursesCount: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
