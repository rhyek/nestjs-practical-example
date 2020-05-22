import { Injectable } from '@nestjs/common';
import pgPromise, { txMode } from 'pg-promise';
import { TodosRepository } from '../todos/todos.repository';
import { IDbConnectionService } from '../interfaces/db-connection-service.interface';
import { DbConnectionService } from './db-connection.service';

export interface IUnitOfWorkRepositories {
  todosRepository: TodosRepository;
}

@Injectable()
export class UnitOfWork {
  constructor(private dbConnectionService: DbConnectionService) {}

  async run<T>(
    work: (repositories: IUnitOfWorkRepositories) => Promise<T>,
    isolationLevel: pgPromise.isolationLevel = txMode.isolationLevel
      .serializable,
  ): Promise<T> {
    return await this.dbConnectionService.connection.tx(
      {
        mode: new txMode.TransactionMode({ tiLevel: isolationLevel }),
      },
      async task => {
        const dbConnectionService: IDbConnectionService = { connection: task };
        const todosRepository = new TodosRepository(dbConnectionService);
        const result = await work({ todosRepository });
        return result;
      },
    );
  }
}
