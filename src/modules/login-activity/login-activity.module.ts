import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LoginActivity,
  LoginActivitySchema,
} from './entities/login-activity.entity';
import { LoginActivityService } from './login-activity.service';
import { LoginActivityController } from './login-activity.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoginActivity.name, schema: LoginActivitySchema },
    ]),
  ],
  controllers: [LoginActivityController],
  providers: [LoginActivityService],
  exports: [LoginActivityService],
})
export class LoginActivityModule {}

