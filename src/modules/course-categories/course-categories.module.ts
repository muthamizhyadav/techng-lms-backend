import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseCategoriesService } from './course-categories.service';
import { CourseCategoriesController } from './course-categories.controller';
import { PublicCourseCategoriesController } from './public-course-categories.controller';
import {
  CourseCategory,
  CourseCategorySchema,
} from './entities/course-category.entity';
import { Course, CourseSchema } from '@modules/courses/entities/course.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseCategory.name, schema: CourseCategorySchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  controllers: [CourseCategoriesController, PublicCourseCategoriesController],
  providers: [CourseCategoriesService],
  exports: [CourseCategoriesService],
})
export class CourseCategoriesModule {}
