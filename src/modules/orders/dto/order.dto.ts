import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: ['0f8fad5b-d9cb-469f-a165-70867728950e'],
    description:
      'Optional list of specific course IDs to checkout. If omitted, checks out all items in cart.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each course ID must be a valid UUID' })
  courseIds?: string[];
}

export class VerifyPaymentDto {
  @ApiProperty({
    example: 'order_Nx8YdF3Q1z2AbC',
    description: 'Razorpay order ID returned during checkout',
  })
  @IsString()
  @IsNotEmpty({ message: 'razorpayOrderId is required' })
  razorpayOrderId: string;

  @ApiProperty({
    example: 'pay_Nx8ZkL7M4p5QeR',
    description: 'Razorpay payment ID from frontend checkout modal',
  })
  @IsString()
  @IsNotEmpty({ message: 'razorpayPaymentId is required' })
  razorpayPaymentId: string;

  @ApiProperty({
    example: '9ef8a23078a9c3d4...',
    description: 'Razorpay signature from frontend checkout modal',
  })
  @IsString()
  @IsNotEmpty({ message: 'razorpaySignature is required' })
  razorpaySignature: string;
}

export class CheckoutResponseDto {
  @ApiProperty({ example: 'order_uuid' })
  orderId: string;

  @ApiProperty({ example: 'order_Nx8YdF3Q1z2AbC' })
  razorpayOrderId: string;

  @ApiProperty({ example: 4999 })
  amount: number;

  @ApiProperty({ example: 499900 })
  amountInPaise: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ example: 'rzp_test_placeholder_key_id' })
  keyId: string;
}
