import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLString as String } from 'graphql';
import { Entity, PrimaryKey, Property, ManyToOne } from 'mikro-orm';
import { v4 as uuid } from 'uuid';
import { User } from '../users/user.entity';

@ObjectType()
@Entity({ tableName: 'todos' })
export class Todo {
  @Field()
  @PrimaryKey()
  id: string;

  @Field()
  @Property()
  name: string;

  @Field()
  @Property()
  description: string;

  @Field(() => User, { nullable: true })
  @ManyToOne({ fieldName: 'assignee_user_id' })
  assignee: User | null;

  @Field()
  @Property({ fieldName: 'created_at' })
  createdAt: Date;

  constructor(name: string, description: string) {
    this.id = uuid();
    this.name = name;
    this.description = description;
    this.assignee = null;
    this.createdAt = new Date();
  }
}
