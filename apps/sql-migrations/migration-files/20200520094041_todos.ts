import * as Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    create extension "uuid-ossp";

    create table todos (
      id uuid not null default uuid_generate_v4(),
      name varchar(50) not null,
      description varchar(100),
      assignee varchar(50)
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    drop table todos;
    drop extension "uuid-ossp";
  `);
}
