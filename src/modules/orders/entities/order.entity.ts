import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { generateUuid } from '@common/utils/uuid.util';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: String, required: true })
  courseId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, default: null })
  thumbnail: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({
  _id: false,
  timestamps: true,
  collection: 'orders',
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Order {
  @Prop({ type: String, default: generateUuid, unique: true })
  _id: string;

  id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({ type: String, required: true, index: true })
  razorpayOrderId: string;

  @Prop({ type: String, default: null })
  razorpayPaymentId: string;

  @Prop({ type: String, default: null })
  razorpaySignature: string;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.CREATED })
  status: OrderStatus;

  @Prop({ type: Date, default: null })
  paidAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
