import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const sampleCurriculum = [
  {
    title: 'Module 1: Foundations & Setup',
    order: 1,
    lessons: [
      { title: 'Course Introduction & Overview', videoUrl: '', duration: 600, order: 1, type: 'video' as const },
      { title: 'Development Environment Setup', videoUrl: '', duration: 900, order: 2, type: 'video' as const },
      { title: 'Core Concepts Deep Dive', videoUrl: '', duration: 1200, order: 3, type: 'video' as const },
      { title: 'Hands-on Practice Session', videoUrl: '', duration: 1500, order: 4, type: 'video' as const },
    ],
  },
  {
    title: 'Module 2: Advanced Topics',
    order: 2,
    lessons: [
      { title: 'Advanced Patterns & Architecture', videoUrl: '', duration: 1800, order: 1, type: 'video' as const },
      { title: 'Performance Optimization', videoUrl: '', duration: 1200, order: 2, type: 'video' as const },
      { title: 'Testing Strategies', videoUrl: '', duration: 1500, order: 3, type: 'video' as const },
    ],
  },
  {
    title: 'Module 3: Real-World Projects',
    order: 3,
    lessons: [
      { title: 'Project Planning & Design', videoUrl: '', duration: 1200, order: 1, type: 'video' as const },
      { title: 'Building the Application', videoUrl: '', duration: 2400, order: 2, type: 'video' as const },
      { title: 'Deployment & DevOps', videoUrl: '', duration: 1500, order: 3, type: 'video' as const },
    ],
  },
  {
    title: 'Module 4: Career Preparation',
    order: 4,
    lessons: [
      { title: 'Portfolio Building', videoUrl: '', duration: 900, order: 1, type: 'video' as const },
      { title: 'Interview Preparation', videoUrl: '', duration: 1200, order: 2, type: 'video' as const },
      { title: 'Final Assessment & Certification', videoUrl: '', duration: 1800, order: 3, type: 'video' as const },
    ],
  },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const courseModel = app.get<Model<any>>(getModelToken('Course'));

  const courses = await courseModel.find({ deletedAt: null });
  console.log(`Found ${courses.length} courses`);

  for (const course of courses) {
    if (course.modules && course.modules.length > 0) {
      console.log(`  Skipping "${course.title}" - already has ${course.modules.length} modules`);
      continue;
    }

    await courseModel.updateOne(
      { _id: course._id },
      { $set: { modules: sampleCurriculum } },
    );
    console.log(`  Seeded ${sampleCurriculum.length} modules into "${course.title}"`);
  }

  console.log('Curriculum seed complete!');
  await app.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
