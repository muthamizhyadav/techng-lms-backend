import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayUnique,
  Matches,
  IsBoolean,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { AdminRole, AdminStatus } from '@shared/enums/user-status.enum';
import { Exclude, Expose } from 'class-transformer';

export class CreateAdminDto {
  @ApiProperty({
    example: 'admin@techng.in',
    description: 'Admin email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Admin@123',
    description:
      'Password - min 8 chars, 1 uppercase, 1 number, 1 special char',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  password: string;

  @ApiProperty({ example: 'Vikram', description: 'First name' })
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'First name can only contain letters and spaces',
  })
  firstName: string;

  @ApiProperty({ example: 'Rao', description: 'Last name' })
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Last name can only contain letters and spaces',
  })
  lastName: string;

  @ApiPropertyOptional({
    example: '+91 9876543210',
    description: 'Phone number with country code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9\s-]{10,20}$/, {
    message: 'Please provide a valid phone number',
  })
  phone?: string;

  @ApiProperty({ example: 'admin', description: 'Admin role', enum: AdminRole })
  @IsEnum(AdminRole, {
    message: 'Role must be admin, super_admin, support, or finance',
  })
  role: AdminRole;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Account status',
    enum: AdminStatus,
    default: AdminStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus = AdminStatus.ACTIVE;

  @ApiPropertyOptional({
    example: ['course.create', 'course.edit', 'student.view'],
    description: 'Fine-grained permissions (ignored if role is super_admin)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions?: string[];

  @ApiPropertyOptional({ example: 'Academics', description: 'Department name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    example: 'Course Manager',
    description: 'Job designation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({
    example: 'Manages course content and batch assignments',
    description: 'Admin bio / responsibilities',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable email notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean = true;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable SMS notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean = true;
}

export class UpdateAdminDto extends PartialType(
  OmitType(CreateAdminDto, ['password', 'email'] as const),
) {}

export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@techng.in',
    description: 'Admin email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'Admin@123', description: 'Account password' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}

export class AdminRegisterDto extends CreateAdminDto {}

export class UpdateAdminPasswordDto {
  @ApiProperty({ example: 'OldPass@123', description: 'Current password' })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({ example: 'NewPass@456', description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  newPassword: string;
}

@Exclude()
export class AdminResponseDto {
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
  role: AdminRole;

  @Expose()
  status: AdminStatus;

  @Expose()
  permissions: string[];

  @Expose()
  department: string;

  @Expose()
  designation: string;

  @Expose()
  bio: string;

  @Expose()
  loginCount: number;

  @Expose()
  lastLoginAt: Date;

  @Expose()
  lastActiveAt: Date;

  @Expose()
  emailNotifications: boolean;

  @Expose()
  smsNotifications: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class UpdateAdminStatusDto {
  @ApiProperty({
    example: 'suspended',
    description: 'New status',
    enum: AdminStatus,
  })
  @IsEnum(AdminStatus)
  status: AdminStatus;

  @ApiPropertyOptional({
    example: 'Violated company policy',
    description: 'Reason for status change',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAdminRoleDto {
  @ApiProperty({ example: 'finance', description: 'New role', enum: AdminRole })
  @IsEnum(AdminRole)
  role: AdminRole;

  @ApiPropertyOptional({
    example: ['payment.view', 'payment.refund', 'report.view'],
    description: 'Custom permissions for this admin',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions?: string[];
}
