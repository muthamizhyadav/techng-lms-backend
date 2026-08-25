import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { AddToCartDto, CartResponseDto } from './dto/cart.dto';

@ApiTags('🛒 Student Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('student-access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart with course details' })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: CartResponseDto,
  })
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add course to cart' })
  @ApiResponse({
    status: 200,
    description: 'Course added to cart',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Course already in cart' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async addToCart(@CurrentUser() user: User, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(user.id, dto.courseId);
  }

  @Delete('items/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove course from cart' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({
    status: 200,
    description: 'Course removed from cart',
    type: CartResponseDto,
  })
  async removeFromCart(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.cartService.removeItem(user.id, courseId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(@CurrentUser() user: User) {
    await this.cartService.clearCart(user.id);
    return { message: 'Cart cleared successfully' };
  }
}
