import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFreeTrainerDto {
  @ApiProperty({ example: 'Monika Sharma' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'monika_trainer' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'Trainer@123' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;

  @ApiPropertyOptional({ example: 'monika@techng.in' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Senior QA Architect & GenAI Lead' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: 'https://cdn.techng.in/trainers/monika.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '10+ years specializing in Playwright, Selenium, and AI-driven test frameworks.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: ['Playwright', 'TypeScript', 'GenAI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertise?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateFreeTrainerDto {
  @ApiPropertyOptional({ example: 'Monika Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'monika_trainer' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'monika@techng.in' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Senior QA Architect & GenAI Lead' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: 'https://cdn.techng.in/trainers/monika.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Updated bio...' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: ['Playwright', 'TypeScript', 'GenAI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertise?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class ResetTrainerCredentialsDto {
  @ApiPropertyOptional({ example: 'new_trainer_user' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'NewSecurePassword@123' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;
}

export class UpdateTrainerStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

