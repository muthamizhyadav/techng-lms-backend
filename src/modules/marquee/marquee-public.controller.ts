import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarqueeService } from './marquee.service';

@ApiTags('🌐 Public Marquee')
@Controller('public/marquees')
export class MarqueePublicController {
  constructor(private readonly marqueeService: MarqueeService) {}

  @Get('active')
  @ApiOperation({
    summary: 'Get currently active marquee announcements (Public)',
    description: 'Returns active, currently scheduled announcements for the LMS header.',
  })
  @ApiResponse({ status: 200, description: 'List of active announcements' })
  async getActive() {
    return this.marqueeService.findActive();
  }
}

