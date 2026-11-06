import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFreeProgressDto {
  @ApiProperty({ description: 'ID of the chapter being watched' })
  @IsString()
  chapterId: string;

  @ApiProperty({ description: 'Total watch time in seconds' })
  @IsNumber()
  @Min(0)
  watchTime: number;

  @ApiProperty({ description: 'Last playback position in seconds' })
  @IsNumber()
  @Min(0)
  lastPosition: number;
}

