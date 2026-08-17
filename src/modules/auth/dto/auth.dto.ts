import { CreateUserDto } from '@/modules/users/dto/user.dto';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentRegisterDto extends CreateUserDto {}

export class StudentLoginDto {
  @ApiProperty({
    example: 'rahul.kumar@email.com',
    description: 'Registered email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'Rahul@123', description: 'Account password' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'Refresh token from login response',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
