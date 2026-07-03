import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check(@Res() res: Response) {
    const result = await this.health.check();
    const httpStatus =
      result.status === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(httpStatus).json(result);
  }
}