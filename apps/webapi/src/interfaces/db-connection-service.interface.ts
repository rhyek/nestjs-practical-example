import pgPromise from 'pg-promise';

export interface IDbConnectionService {
  connection: pgPromise.IDatabase<{}> | pgPromise.ITask<{}>;
}
