import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging registration token for this device.',
    example: 'fM1s...:APA91b...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;
}
