import pgPromise from 'pg-promise';
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { IConfig } from '../interfaces/config.interface';
import { IDbConnectionService } from '../interfaces/db-connection-service.interface';

@Injectable()
export class DbConnectionService
  implements IDbConnectionService, OnModuleInit, OnModuleDestroy {
  readonly connection: pgPromise.IDatabase<{}>;

  constructor(@Inject('CONFIG') config: IConfig) {
    const { dbUrl } = config;
    const pgp = pgPromise();
    this.connection = pgp({
      connectionString: dbUrl,
      idleTimeoutMillis: 0, // connections should remain idle indefinitely
      max: 20, // connection pool size
    });
  }

  async onModuleInit(): Promise<void> {
    // let tries = 0;
    // while (tries < 5) {
    //   tries++;
    //   try {
    //     await this.connection.one<{ version: string }>('select version()');
    //   } catch (error) {
    //     if (tries >= 10) {
    //       throw error;
    //     }
    //     await new Promise(resolve => {
    //       setTimeout(resolve, 2_000);
    //     });
    //     continue;
    //   }
    // }
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.$pool.end();
  }
}
