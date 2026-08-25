import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order, OrderDocument, OrderStatus } from './entities/order.entity';
import { CartService } from '../cart/cart.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Course, CourseDocument } from '../courses/entities/course.entity';
import {
  CreateOrderDto,
  VerifyPaymentDto,
  CheckoutResponseDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private razorpayInstance: Razorpay | null = null;

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');

    if (keyId && keySecret) {
      this.razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }

  private getRazorpay(): Razorpay {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');

    if (!keyId || !keySecret || keyId === 'rzp_test_placeholder_key_id') {
      this.logger.warn(
        'Razorpay keys are not configured or set to placeholder. Please update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
      );
    }

    if (!this.razorpayInstance && keyId && keySecret) {
      this.razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }

    return this.razorpayInstance;
  }

  async createCheckoutOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<CheckoutResponseDto> {
    let orderItems: Array<{
      courseId: string;
      title: string;
      price: number;
      thumbnail: string;
    }> = [];

    if (dto.courseIds && dto.courseIds.length > 0) {
      const courses = await this.courseModel.find({
        _id: { $in: dto.courseIds },
        deletedAt: null,
      });
      if (courses.length !== dto.courseIds.length) {
        throw new BadRequestException('One or more selected courses were not found');
      }
      orderItems = courses.map((c) => ({
        courseId: c._id.toString(),
        title: c.title,
        price: c.price || 0,
        thumbnail: c.thumbnail || '',
      }));
    } else {
      const cart = await this.cartService.getCart(userId);
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }
      orderItems = cart.items.map((item) => ({
        courseId: item.courseId,
        title: item.title,
        price: item.price || 0,
        thumbnail: item.thumbnail || '',
      }));
    }

    // Check if user is already enrolled in any of these courses
    for (const item of orderItems) {
      const enrolled = await this.enrollmentsService.isEnrolled(
        userId,
        item.courseId,
      );
      if (enrolled) {
        throw new BadRequestException(
          `You are already enrolled in "${item.title}"`,
        );
      }
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);
    const finalAmount = totalAmount < 1 ? 1 : totalAmount;
    const amountInPaise = Math.round(finalAmount * 100);

    const keyId = this.configService.get<string>('razorpay.keyId') || '';
    const keySecret = this.configService.get<string>('razorpay.keySecret') || '';
    const currency = this.configService.get<string>('razorpay.currency') || 'INR';

    let razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // If real Razorpay keys are provided, create order via Razorpay API
    if (keyId && keySecret && keyId !== 'rzp_test_placeholder_key_id') {
      try {
        const rzp = this.getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: amountInPaise,
          currency,
          receipt: `rcpt_${Date.now().toString().slice(-8)}`,
          notes: {
            userId,
            courseCount: orderItems.length.toString(),
          },
        });
        razorpayOrderId = rzpOrder.id;
      } catch (error) {
        this.logger.error('Error creating Razorpay order:', error);
        throw new BadRequestException(
          (error as any)?.error?.description || (error as any)?.message || 'Failed to create payment order with Razorpay',
        );
      }
    }

    const order = await this.orderModel.create({
      userId,
      items: orderItems,
      totalAmount: finalAmount,
      currency,
      razorpayOrderId,
      status: OrderStatus.CREATED,
    });

    return {
      orderId: order._id.toString(),
      razorpayOrderId,
      amount: finalAmount,
      amountInPaise,
      currency,
      keyId,
    };
  }

  async verifyPayment(
    userId: string,
    dto: VerifyPaymentDto,
  ): Promise<{ success: boolean; message: string; order: OrderDocument }> {
    const order = await this.orderModel.findOne({
      razorpayOrderId: dto.razorpayOrderId,
      userId,
    });

    if (!order) {
      throw new NotFoundException('Order not found for this payment');
    }

    if (order.status === OrderStatus.PAID) {
      return {
        success: true,
        message: 'Payment already verified',
        order,
      };
    }

    const keySecret = this.configService.get<string>('razorpay.keySecret') || '';
    const keyId = this.configService.get<string>('razorpay.keyId') || '';

    // Verify signature if real Razorpay keys are active
    if (keySecret && keyId !== 'rzp_test_placeholder_key_id') {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== dto.razorpaySignature) {
        order.status = OrderStatus.FAILED;
        await order.save();
        throw new BadRequestException('Invalid payment signature verification');
      }
    }

    // Update order status to paid
    order.status = OrderStatus.PAID;
    order.razorpayPaymentId = dto.razorpayPaymentId;
    order.razorpaySignature = dto.razorpaySignature;
    order.paidAt = new Date();
    await order.save();

    // Auto-enroll student into each course
    for (const item of order.items) {
      await this.enrollmentsService.enrollUserInCourse(
        userId,
        item.courseId,
        order._id.toString(),
      );
    }

    // Clear cart for the user
    await this.cartService.clearCart(userId);

    return {
      success: true,
      message: 'Payment verified and courses enrolled successfully',
      order,
    };
  }

  async getMyOrders(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
