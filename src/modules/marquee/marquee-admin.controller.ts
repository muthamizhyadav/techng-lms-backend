import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MarqueeService } from './marquee.service';
import {
  CreateMarqueeDto,
  UpdateMarqueeDto,
  UpdateMarqueeStatusDto,
  QueryMarqueeDto,
} from './dto/marquee.dto';
import { JwtAdminGuard } from '@common/guards/jwt-admin.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { AdminRole } from '@shared/enums/user-status.enum';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '@shared/interfaces/jwt-payload.interface';

@ApiTags('📢 Marquee Management (Admin)')
@Controller('admin/marquees')
@UseGuards(JwtAdminGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
@ApiBearerAuth('admin-access-token')
export class MarqueeAdminController {
  constructor(private readonly marqueeService: MarqueeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new marquee announcement' })
  async create(
    @Body() dto: CreateMarqueeDto,
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    return this.marqueeService.create(dto, admin.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all marquee announcements' })
  async findAll(@Query() query: QueryMarqueeDto) {
    return this.marqueeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get marquee announcement details' })
  async findOne(@Param('id') id: string) {
    return this.marqueeService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update marquee announcement' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMarqueeDto,
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    return this.marqueeService.update(id, dto, admin.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle marquee announcement active status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMarqueeStatusDto,
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    return this.marqueeService.updateStatus(id, dto.isActive, admin.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a marquee announcement' })
  async remove(@Param('id') id: string) {
    return this.marqueeService.remove(id);
  }
}

