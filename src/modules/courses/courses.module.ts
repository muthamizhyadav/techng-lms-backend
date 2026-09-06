import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PublicCoursesController } from './public-courses.controller';
import { Course, CourseSchema } from './entities/course.entity';
import { Enrollment, EnrollmentSchema } from '../enrollments/entities/enrollment.entity';
import { User, UserSchema } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CoursesController, PublicCoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
