import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      // Bağlantı kopunca sonsuz retry yerine makul bir strateji
      retryStrategy: (times) => Math.min(times * 200, 2000),
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => this.logger.log('Redis bağlandı'));
    this.client.on('error', (err) =>
      this.logger.error(`Redis hatası: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /** Ham JSON string döndürür; parse çağıran tarafta. */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Cache parse hatası, key: ${key}`);
      return null;
    }
  }

  /** ttlSeconds verilirse EX ile expire kurar. */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, raw, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, raw);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Pattern'e uyan tüm key'leri siler (invalidation için). */
  async delByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const pipeline = this.client.pipeline();
    let hasKeys = false;

    for await (const keys of stream) {
      if (keys.length) {
        hasKeys = true;
        keys.forEach((key: string) => pipeline.del(key));
      }
    }
    if (hasKeys) await pipeline.exec();
  }

  /** Health Check için Ping metodu */
  async ping(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}