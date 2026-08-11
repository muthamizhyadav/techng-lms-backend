import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '@modules/users/users.service';
import { AdminsService } from '@modules/admins/admins.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            updateRefreshToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
            updateLastLogin: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: AdminsService,
          useValue: {
            create: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            updateRefreshToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
            updateLastLogin: jest.fn(),
            findOne: jest.fn(),
            countAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
