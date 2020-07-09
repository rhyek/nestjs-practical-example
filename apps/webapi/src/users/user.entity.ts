import { ObjectType, Field } from '@nestjs/graphql';
import { Entity, PrimaryKey, Property, OneToMany, Collection } from 'mikro-orm';
import { v4 as uuid } from 'uuid';
import { Todo } from '../todos/todo.entity';

@ObjectType()
@Entity({ tableName: 'users' })
export class User {
  @Field()
  @PrimaryKey()
  id: string;

  @Field()
  @Property()
  email: string;

  @Field()
  @Property()
  name: string;

  @Field()
  @Property({ fieldName: 'created_at' })
  createdAt: Date;

  @Field(() => [Todo])
  @OneToMany(
    () => Todo,
    todo => todo.assignee,
  )
  todos = new Collection<Todo>(this);

  constructor(email: string, name: string) {
    this.id = uuid();
    this.email = email;
    this.name = name;
    this.createdAt = new Date();
  }
}
