import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'mikro-orm';

@Injectable()
export class DatabaseHelper {
  constructor(private em: EntityManager) {}

  async tx<T>(cb: (forkedEm: EntityManager) => Promise<T>): Promise<T> {
    return await this.em.transactional(async forkedEm => {
      try {
        // await em.execute('set transaction isolation level serializable') in v4
        await forkedEm
          .getConnection()
          .execute(
            'set transaction isolation level serializable',
            [],
            'run',
            forkedEm.getTransactionContext(),
          );
        return await cb(forkedEm);
      } catch (error) {
        if (error.code === '40001') {
          // serialization_failure
          throw new ConflictException('Concurrency error. Please try again.');
        }
        throw error;
      }
    });
  }
}
