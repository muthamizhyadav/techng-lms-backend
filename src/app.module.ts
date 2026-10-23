import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminsModule } from './modules/admins/admins.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CourseCategoriesModule } from './modules/course-categories/course-categories.module';
import { CartModule } from './modules/cart/cart.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import storageConfig from './config/storage.config';
import razorpayConfig from './config/razorpay.config';
import googleConfig from './config/google.config';
import firebaseConfig from './config/firebase.config';
import mailConfig from './config/mail.config';
import { DatabaseModule } from './database/database.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        storageConfig,
        razorpayConfig,
        googleConfig,
        firebaseConfig,
        mailConfig,
      ],
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AdminsModule,
    CoursesModule,
    CourseCategoriesModule,
    UploadsModule,
    CartModule,
    EnrollmentsModule,
    OrdersModule,
    DashboardModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
