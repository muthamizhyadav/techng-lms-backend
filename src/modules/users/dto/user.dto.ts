import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  Matches,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { UserStatus } from '@/shared/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'rahul.kumar@email.com', description: 'Student email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Rahul@123', description: 'Password - min 8 chars, 1 uppercase, 1 number, 1 special char' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  password: string;

  @ApiProperty({ example: 'Rahul', description: 'First name' })
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s]+$/, { message: 'First name can only contain letters and spaces' })
  firstName: string;

  @ApiProperty({ example: 'Kumar', description: 'Last name' })
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s]+$/, { message: 'Last name can only contain letters and spaces' })
  lastName: string;

  @ApiPropertyOptional({ example: '+91 9876543210', description: 'Phone number with country code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9\s-]{10,20}$/, { message: 'Please provide a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: '1995-08-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ example: 'male', description: 'Gender', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'], { message: 'Gender must be male, female, or other' })
  gender?: string;

  @ApiPropertyOptional({ example: '123 Anna Salai, T Nagar', description: 'Street address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Chennai', description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Tamil Nadu', description: 'State' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country', default: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string = 'India';

  @ApiPropertyOptional({ example: '600017', description: 'PIN code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[0-9]{4,10}$/, { message: 'PIN code must be 4-10 digits' })
  pincode?: string;

  @ApiPropertyOptional({ example: 'B.Tech Computer Science', description: 'Highest educational qualification' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  highestQualification?: string;

  @ApiPropertyOptional({ example: 'Anna University', description: 'College/University name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  college?: string;

  @ApiPropertyOptional({ example: 2018, description: 'Year of graduation' })
  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2030)
  yearOfPassing?: number;

  @ApiPropertyOptional({ example: 'Infosys', description: 'Current company (if working)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentCompany?: string;

  @ApiPropertyOptional({ example: 'Software Engineer', description: 'Current job role' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobRole?: string;

  @ApiPropertyOptional({ example: 2, description: 'Years of experience' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'en', description: 'Preferred language', default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredLanguage?: string = 'en';

  @ApiPropertyOptional({ example: true, description: 'Enable email notifications', default: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean = true;

  @ApiPropertyOptional({ example: true, description: 'Enable SMS notifications', default: true })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean = true;

  @ApiPropertyOptional({ example: true, description: 'Enable push notifications', default: true })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean = true;
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email'] as const),
) {}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'OldPass@123', description: 'Current password' })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({ example: 'NewPass@456', description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  newPassword: string;
}


@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  fullName: string;

  @Expose()
  phone: string;

  @Expose()
  avatar: string;

  @Expose()
  status: UserStatus;

  @Expose()
  emailVerified: boolean;

  @Expose()
  phoneVerified: boolean;

  @Expose()
  profileCompletionPercentage: number;

  @Expose()
  isProfileComplete: boolean;

  @Expose()
  preferredLanguage: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}