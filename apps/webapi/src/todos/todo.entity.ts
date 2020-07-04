import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLString as String } from 'graphql';
import { Entity, PrimaryKey, Property } from 'mikro-orm';

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
  @Field(() => String, { nullable: true })
  @Property()
  assignee: string | null;
  @Field()
  @Property()
  created_at: Date;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.assignee = null;
  }
}
