import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { response } from 'express';
import { GetTodoDto } from '../src/todos/dtos/get-todo.dto';

describe('WebApi (e2e)', () => {
  let app: INestApplication;
  let request: supertest.SuperTest<supertest.Test>;
  let id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('CONFIG')
      .useValue({ dbUrl: 'postgres://test:test@localhost:9000/test' })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());
  }, 100_000);

  afterAll(async () => {
    await app.close();
  });

  describe('Todos Controller', () => {
    it('findAll initially returns an empty list of todos', () => {
      return request
        .get('/todos')
        .expect(200)
        .then(response => {
          expect(response.body).toHaveLength(0);
        });
    });

    it('findOne throws BadRequestException for non-uuid ids', async () => {
      await request
        .get('/todos/1')
        .expect(400)
        .then(response => {
          expect(response.body.message).toMatch(/uuid\s+is\sexpected/);
        });
    });

    it('findOne throws NotFoundException for unknown ids', async () => {
      await request
        .get('/todos/ac3c374a-69ea-4893-a538-27b5a0d06a35')
        .expect(404);
    });

    it('create throws BadRequestException for an invalid payload', async () => {
      await request
        .post('/todos')
        .send({
          name: 'name',
        })
        .expect(400);
    });

    it('create fails for a payload with a longer-than-50 name', async () => {
      await request
        .post('/todos')
        .send({
          name: new Array(51).fill('a').join(''),
          description: 'description',
        })
        .expect(400);
    });

    it('create fails for a payload with a longer-than-100 description', async () => {
      await request
        .post('/todos')
        .send({
          name: 'name',
          description: new Array(101).fill('a').join(''),
        })
        .expect(400);
    });

    it('create succeeds for a valid payload', async () => {
      await request
        .post('/todos')
        .send({
          name: 'name',
          description: 'description',
        })
        .expect(201)
        .then(response => {
          const { id: generatedId } = response.body as GetTodoDto;
          expect(generatedId).toBeTruthy();
          id = generatedId;
        });
    });

    it('findAll returns a 1-item array', async () => {
      await request
        .get('/todos')
        .expect(200)
        .then(response => {
          expect(response.body).toHaveLength(1);
        });
    });

    it('assign fails when the new assignee is longer than 100', async () => {
      const assignee = new Array(101).fill('a').join('');
      await request.patch(`/todos/${id}/assign-to/${assignee}`).expect(400);
    });

    it('assign correctly modifies assignee', async () => {
      await request.patch(`/todos/${id}/assign-to/person-a`).expect(200);
      await request
        .get(`/todos/${id}`)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('assignee', 'person-a');
        });
    });

    it('assign fails when the todo is already assigned', async () => {
      await request.patch(`/todos/${id}/assign-to/person-b`).expect(400);
    });

    it('remove succeeds for known id', async () => {
      const response = await request.get('/todos').expect(200);
      const [todo] = response.body as GetTodoDto[];
      const { id } = todo;
      await request.delete(`/todos/${id}`).expect(200);
      await request
        .get('/todos')
        .expect(200)
        .then(response => {
          expect(response.body).toHaveLength(0);
        });
    });
  });
});
