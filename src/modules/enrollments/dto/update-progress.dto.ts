import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty({ description: 'Lesson ID to update progress for' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'Total watch time in seconds' })
  @IsNumber()
  @Min(0)
  watchTime: number;

  @ApiProperty({ description: 'Last playback position in seconds' })
  @IsNumber()
  @Min(0)
  lastPosition: number;
}
