import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { isValidISODateString } from 'iso-datestring-validator';
import { AppModule } from '../src/app.module';
import { TodoFindOneDTO } from '../src/todos/dtos/todo-find-one.dto';

describe('WebApi (e2e)', () => {
  let app: INestApplication;
  let request: supertest.SuperTest<supertest.Test>;
  let id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule.register({
          mikroOrmOptions: {
            host: 'localhost',
            port: 9000,
            user: 'test',
            password: 'test',
            dbName: 'test',
          },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
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

    it('findOne throws 400 for non-uuid ids', async () => {
      await request
        .get('/todos/1')
        .expect(400)
        .then(response => {
          expect(response.body.message).toMatch(/uuid\s+is\sexpected/);
        });
    });

    it('findOne throws 404 for unknown ids', async () => {
      await request
        .get('/todos/ac3c374a-69ea-4893-a538-27b5a0d06a35')
        .expect(404);
    });

    it('create throws 400 for an invalid payload', async () => {
      await request
        .post('/todos')
        .send({
          name: 'name',
        })
        .expect(400);
    });

    it('create throws 400 for a payload with a longer-than-50 name', async () => {
      await request
        .post('/todos')
        .send({
          name: new Array(51).fill('a').join(''),
          description: 'description',
        })
        .expect(400)
        .then(response => {
          const message = response.body.message.find((m: string) =>
            m.includes('shorter than or equal'),
          );
          expect(message).toBeDefined();
        });
    });

    it('create throws 400 for a payload with a longer-than-100 description', async () => {
      await request
        .post('/todos')
        .send({
          name: 'name',
          description: new Array(101).fill('a').join(''),
        })
        .expect(400)
        .then(response => {
          const message = response.body.message.find((m: string) =>
            m.includes('shorter than or equal'),
          );
          expect(message).toBeDefined();
        });
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
          const { id: generatedId } = response.body as TodoFindOneDTO;
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

    it('findOne returns a TodoFindOneDto for known ids', async () => {
      await request.get(`/todos/${id}`).expect(200);
    });

    it('findOne returns a TodoFindOneDto and createdAt is a valid ISO 8601 date string', async () => {
      await request
        .get(`/todos/${id}`)
        .expect(200)
        .then(response => {
          const { createdAt } = response.body;
          expect(createdAt).toBeDefined();
          expect(isValidISODateString(createdAt)).toBe(true);
        });
    });

    it('assign throws 400 when the new assignee is longer than 100', async () => {
      const assignee = new Array(101).fill('a').join('');
      await request
        .patch(`/todos/2/assign-to/${assignee}`)
        .expect(400)
        .then(response => {
          const message = response.body.message.find((m: string) =>
            m.includes('shorter than or equal'),
          );
          expect(message).toBeDefined();
        });
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

    it('assign throws 400 when the todo is already assigned', async () => {
      await request
        .patch(`/todos/${id}/assign-to/person-b`)
        .expect(400)
        .then(response => {
          expect(response.body.message).toContain('Todo is already assigned');
        });
    });

    it('remove succeeds for known id', async () => {
      await request.delete(`/todos/${id}`).expect(200);
      await request
        .get('/todos')
        .expect(200)
        .then(response => {
          expect(response.body).toHaveLength(0);
        });
    });

    it(`for 100 concurrent assign requests on the same todo, one responds with 200, the rest 400 or 409`, async () => {
      const response = await request
        .post('/todos')
        .send({
          name: 'concurrency-test',
          description: 'description',
        })
        .expect(201);
      const { id } = response.body as TodoFindOneDTO;
      const promises = new Array(100)
        .fill(null)
        .map((_, index) =>
          request
            .patch(`/todos/${id}/assign-to/person-${index}`)
            .then(response => response.status),
        );
      const statuses = await Promise.all(promises);
      const successfulCount = statuses.filter(status => status === 200).length;
      const statusesAreValid = statuses.every(status =>
        [200, 400, 409].includes(status),
      );
      expect(successfulCount).toBe(1);
      expect(statusesAreValid).toBe(true);
    });
  });
});
