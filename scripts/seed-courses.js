const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/techng_lms';

const courseSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    instructor: { type: String },
    category: { type: String, required: true },
    status: { type: String, default: 'published' },
    students: { type: Number, default: 0 },
    duration: { type: String },
    level: { type: String },
    skills: { type: [String], default: [] },
    price: { type: Number, default: 0 },
    thumbnail: { type: String },
    videoUrl: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'courses' }
);

const Course = mongoose.model('Course', courseSchema);

const sampleCourses = [
  {
    title: 'Full Stack Java & Spring Boot Masterclass',
    subtitle: 'Build robust enterprise applications using Java 21, Spring Boot, React, and PostgreSQL.',
    description: 'Master back-end architecture with Java 21, Spring Boot 3, Microservices, Security, and modern React front-ends. This comprehensive bootcamp takes you from foundational OOP concepts to deploying enterprise-grade scalable cloud applications.',
    category: 'Web Development',
    instructor: 'Dr. Robert Carter (Principal Architect)',
    duration: '42 Hours',
    level: 'Intermediate',
    price: 6999,
    students: 1280,
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    skills: ['Java 21', 'Spring Boot 3', 'Microservices', 'PostgreSQL', 'Docker'],
    status: 'published',
  },
  {
    title: 'Playwright & Selenium Automation Framework',
    subtitle: 'End-to-end automated UI and API testing with JavaScript, TypeScript, and Python.',
    description: 'Step into automated software quality assurance. Build robust Page Object Models, execute multi-browser tests in parallel, integrate continuous integration with GitHub Actions, and master modern Playwright & Selenium tooling.',
    category: 'Automation Testing',
    instructor: 'Sarah Jenkins (Lead QA Engineer)',
    duration: '35 Hours',
    level: 'Beginner to Advanced',
    price: 5999,
    students: 950,
    thumbnail: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600',
    skills: ['Playwright', 'Selenium', 'TypeScript', 'CI/CD', 'Jest'],
    status: 'published',
  },
  {
    title: 'Generative AI & Python Engineering 2026',
    subtitle: 'Build intelligent LLM applications, RAG pipelines, and AI Agents with LangChain.',
    description: 'Dive deep into Generative AI development using Python. Learn to build Custom GPT apps, implement Vector Databases (Pinecone/Chroma), master Retrieval-Augmented Generation (RAG), and deploy autonomous AI agents.',
    category: 'AI & Data Science',
    instructor: 'Alex Rivera (AI Research Lead)',
    duration: '50 Hours',
    level: 'Advanced',
    price: 7999,
    students: 2100,
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600',
    skills: ['Python', 'LangChain', 'OpenAI', 'RAG Pipelines', 'Vector DBs'],
    status: 'published',
  },
  {
    title: 'AWS Certified Cloud Architect & DevOps',
    subtitle: 'Master AWS infrastructure, Terraform Infrastructure-as-Code, and Kubernetes pipelines.',
    description: 'Prepare for the AWS Solutions Architect Certification while learning real-world Cloud Engineering skills. Set up VPC networks, configure IAM policies, automate deployments with Terraform, and run containerized workloads on AWS EKS.',
    category: 'Cloud & DevOps',
    instructor: 'David Vance (Senior DevOps Specialist)',
    duration: '38 Hours',
    level: 'Intermediate',
    price: 6499,
    students: 840,
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600',
    skills: ['AWS', 'Terraform', 'Kubernetes', 'Docker', 'CI/CD'],
    status: 'published',
  },
  {
    title: 'Full Stack React 19 & Next.js 14 Web Development',
    subtitle: 'Modern React hooks, Server Components, Tailwind CSS, TypeScript, and Prisma ORM.',
    description: 'Construct blazingly fast full-stack applications with Next.js App Router, React 19 features, Server Actions, Tailwind CSS, and full PostgreSQL integration. Covers authentication, state management, and real-time websockets.',
    category: 'Web Development',
    instructor: 'Priya Sharma (Senior Frontend Architect)',
    duration: '48 Hours',
    level: 'All Levels',
    price: 5499,
    students: 1750,
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=600',
    skills: ['React 19', 'Next.js 14', 'TypeScript', 'Tailwind CSS', 'Prisma'],
    status: 'published',
  },
  {
    title: 'Flutter & React Native Cross-Platform Mobile Dev',
    subtitle: 'Ship high-performance iOS and Android mobile apps from a single codebase.',
    description: 'Build native-feeling mobile apps with Flutter (Dart) and React Native. Integrate push notifications, device cameras, local SQLite caching, offline sync, payment gateways, and publish to App Store and Google Play.',
    category: 'Mobile App Dev',
    instructor: 'Marcus Chen (Mobile Engineering Lead)',
    duration: '40 Hours',
    level: 'Beginner to Intermediate',
    price: 6299,
    students: 620,
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=600',
    skills: ['Flutter', 'React Native', 'Dart', 'iOS & Android', 'State Management'],
    status: 'published',
  },
];

async function seed() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    for (const courseData of sampleCourses) {
      const existing = await Course.findOne({ title: courseData.title });
      if (!existing) {
        await Course.create({
          _id: uuidv4(),
          ...courseData,
        });
        console.log(`Created course: "${courseData.title}"`);
      } else {
        console.log(`Course already exists: "${courseData.title}"`);
      }
    }

    console.log('Course database seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding courses:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
