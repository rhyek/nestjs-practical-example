export interface IRepository<T, A> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  add(values: A): Promise<T>;
  update(record: T): Promise<T | null>;
  remove(id: string): Promise<T | null>;
}
