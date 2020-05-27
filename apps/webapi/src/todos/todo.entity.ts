import { Entity, PrimaryKey, Property } from 'mikro-orm';

@Entity({ tableName: 'todos' })
export class Todo {
  @PrimaryKey()
  id: string;
  @Property()
  name: string;
  @Property()
  description: string;
  @Property()
  assignee: string | null;
  @Property()
  created_at: Date;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.assignee = null;
  }
}
