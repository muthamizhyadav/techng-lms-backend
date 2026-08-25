import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './entities/cart.entity';
import { Course, CourseDocument } from '../courses/entities/course.entity';
import { CartResponseDto, CartCourseItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
  ) {}

  async getCart(userId: string): Promise<CartResponseDto> {
    let cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }

    const courseIds = cart.items.map((i) => i.courseId);
    const courses = await this.courseModel.find({
      _id: { $in: courseIds },
      deletedAt: null,
    });

    const courseMap = new Map<string, CourseDocument>();
    courses.forEach((c) => {
      courseMap.set(c._id.toString(), c);
    });

    const populatedItems: CartCourseItemDto[] = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const course = courseMap.get(item.courseId);
      if (course) {
        const itemDto: CartCourseItemDto = {
          courseId: course._id.toString(),
          title: course.title,
          category: course.category,
          price: course.price || 0,
          thumbnail: course.thumbnail || '',
          instructor: course.instructor || '',
          duration: course.duration || '',
          addedAt: item.addedAt,
        };
        populatedItems.push(itemDto);
        totalAmount += course.price || 0;
      }
    }

    return {
      id: cart._id.toString(),
      userId: cart.userId,
      items: populatedItems,
      totalAmount,
      totalItems: populatedItems.length,
    };
  }

  async addItem(userId: string, courseId: string): Promise<CartResponseDto> {
    const course = await this.courseModel.findOne({ _id: courseId, deletedAt: null });
    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    let cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      cart = await this.cartModel.create({
        userId,
        items: [{ courseId, addedAt: new Date() }],
      });
    } else {
      const alreadyInCart = cart.items.some((i) => i.courseId === courseId);
      if (alreadyInCart) {
        throw new ConflictException('Course is already in your cart');
      }

      cart.items.push({ courseId, addedAt: new Date() });
      await cart.save();
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, courseId: string): Promise<CartResponseDto> {
    const cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((i) => i.courseId !== courseId);
    await cart.save();

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartModel.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { upsert: true },
    );
  }
}
