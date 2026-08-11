import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AdminsService } from './admins.service';
import { Admin } from './entities/admin.entity';

describe('AdminsService', () => {
  let service: AdminsService;

  const adminModelMock = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        {
          provide: getModelToken(Admin.name),
          useValue: adminModelMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(12),
          },
        },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
