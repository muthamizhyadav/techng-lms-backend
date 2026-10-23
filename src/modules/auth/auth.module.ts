import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StudentJwtStrategy } from './strategies/student-jwt.strategy';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './strategies/google-auth.guard';
import { UsersModule } from '@modules/users/users.module';
import { AdminsModule } from '@modules/admins/admins.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { MailModule } from '@modules/mail/mail.module';
import { AuthAdminController } from './auth-admin.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'student-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.student.secret'),
        signOptions: {
          expiresIn: config.get('jwt.student.expiresIn'),
        },
      }),
    }),
    UsersModule,
    AdminsModule,
    NotificationsModule,
    MailModule,
  ],
  controllers: [AuthController, AuthAdminController],
  providers: [
    AuthService,
    StudentJwtStrategy,
    AdminJwtStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
