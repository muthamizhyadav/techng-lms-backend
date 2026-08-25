import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
    description: 'Course UUID to add to cart',
  })
  @IsUUID('4', { message: 'Invalid course ID format' })
  @IsNotEmpty({ message: 'courseId is required' })
  courseId: string;
}

export class CartCourseItemDto {
  @ApiProperty({ example: '0f8fad5b-d9cb-469f-a165-70867728950e' })
  courseId: string;

  @ApiProperty({ example: 'Full Stack Web Development' })
  title: string;

  @ApiProperty({ example: 'Web Development' })
  category: string;

  @ApiProperty({ example: 4999 })
  price: number;

  @ApiProperty({ example: 'https://cdn.example.com/thumb.jpg', required: false })
  thumbnail: string;

  @ApiProperty({ example: 'Bola Johnson', required: false })
  instructor: string;

  @ApiProperty({ example: '6 Weeks', required: false })
  duration: string;

  @ApiProperty({ example: '2026-08-25T10:00:00Z' })
  addedAt: Date;
}

export class CartResponseDto {
  @ApiProperty({ example: 'c878fbfa-2713-4412-a16a-73d76e7372cf' })
  id: string;

  @ApiProperty({ example: '0f8fad5b-d9cb-469f-a165-70867728950e' })
  userId: string;

  @ApiProperty({ type: [CartCourseItemDto] })
  items: CartCourseItemDto[];

  @ApiProperty({ example: 4999 })
  totalAmount: number;

  @ApiProperty({ example: 1 })
  totalItems: number;
}
