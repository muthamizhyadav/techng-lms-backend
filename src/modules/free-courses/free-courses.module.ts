import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FreeCourse,
  FreeCourseSchema,
} from './entities/free-course.entity';
import {
  FreeCourseEnrollment,
  FreeCourseEnrollmentSchema,
} from './entities/free-course-enrollment.entity';
import {
  User,
  UserSchema,
} from '@modules/users/entities/user.entity';
import { FreeCoursesAdminService } from './free-courses-admin.service';
import { FreeCoursesStudentService } from './free-courses-student.service';
import { FreeCourseStorageService } from './storage/free-course-storage.service';
import { FreeCoursesAdminController } from './free-courses-admin.controller';
import { FreeCoursesStudentController } from './free-courses-student.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FreeCourse.name, schema: FreeCourseSchema },
      {
        name: FreeCourseEnrollment.name,
        schema: FreeCourseEnrollmentSchema,
      },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    FreeCoursesAdminController,
    FreeCoursesStudentController,
  ],
  providers: [
    FreeCoursesAdminService,
    FreeCoursesStudentService,
    FreeCourseStorageService,
  ],
  exports: [
    FreeCoursesAdminService,
    FreeCoursesStudentService,
    FreeCourseStorageService,
  ],
})
export class FreeCoursesModule {}

