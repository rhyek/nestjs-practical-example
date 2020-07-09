import * as Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    create extension "uuid-ossp";

    create table users (
      id uuid not null primary key,
      email varchar(100) not null unique,
      name varchar(50) not null,
      created_at timestamptz not null
    );

    create table todos (
      id uuid not null primary key,
      name varchar(50) not null,
      description varchar(100),
      assignee_user_id uuid references users (id),
      created_at timestamptz not null
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    drop table todos;
    drop table users;
    drop extension "uuid-ossp";
  `);
}
