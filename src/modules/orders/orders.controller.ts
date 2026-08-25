import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import {
  CreateOrderDto,
  VerifyPaymentDto,
  CheckoutResponseDto,
} from './dto/order.dto';

@ApiTags('💳 Orders & Checkout')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('student-access-token')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate Razorpay checkout order for student cart or specific courses',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Razorpay order created for payment processing',
    type: CheckoutResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cart empty or invalid items' })
  async checkout(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.ordersService.createCheckoutOrder(user.id, dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Razorpay payment signature and complete enrollment',
  })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment verified and courses enrolled',
  })
  @ApiResponse({ status: 400, description: 'Invalid signature or payment failed' })
  async verifyPayment(
    @CurrentUser() user: User,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.ordersService.verifyPayment(user.id, dto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get order and payment history for student' })
  @ApiResponse({ status: 200, description: 'Order history retrieved' })
  async getMyOrders(@CurrentUser() user: User) {
    return this.ordersService.getMyOrders(user.id);
  }
}
