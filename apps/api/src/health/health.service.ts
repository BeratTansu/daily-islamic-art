import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';

type ServiceStatus = 'up' | 'down';

export interface HealthResult {
  status: ServiceStatus;          // genel durum (DB+Redis'e bağlı)
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;       // bilgi amaçlı — genel status'ü etkilemez
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  async check(): Promise<HealthResult> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    // Genel status yalnızca çekirdek bağımlılıklara bağlı: DB + Redis.
    // Storage bilgi amaçlı, status'ü etkilemez.
    const status: ServiceStatus =
      database === 'up' && redis === 'up' ? 'up' : 'down';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: { database, redis, storage },
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    return (await this.redis.ping()) ? 'up' : 'down';
  }

  private async checkStorage(): Promise<ServiceStatus> {
    return this.storage.isReady() ? 'up' : 'down';
  }
}