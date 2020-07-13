import { TestingModule, Test } from '@nestjs/testing';
import { MikroORM } from 'mikro-orm';
import { MikroOrmModule } from 'nestjs-mikro-orm';
import { Todo } from '../todos/todo.entity';
import { User } from '../users/user.entity';
import { GqlToQueryBuilderHelper } from './gql-to-querybuilder.helper';

describe('GqlToQueryBuilderHelper', () => {
  let orm: MikroORM;
  let gqlToQueryBuilderHelper: GqlToQueryBuilderHelper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          entities: [Todo, User],
          type: 'sqlite',
          dbName: 'test.sqlite3',
          autoFlush: false,
        }),
        MikroOrmModule.forFeature({ entities: [Todo, User] }),
      ],
      providers: [GqlToQueryBuilderHelper],
    }).compile();

    orm = module.get<MikroORM>(MikroORM);
    gqlToQueryBuilderHelper = module.get<GqlToQueryBuilderHelper>(
      GqlToQueryBuilderHelper,
    );
  });

  afterEach(async () => {
    await orm.close();
  });

  describe('transformOperand', () => {
    it('_eq', () => {
      expect(
        gqlToQueryBuilderHelper['transformCondition']('_eq', 'value'),
      ).toEqual(['$eq', 'value']);
    });
    it('_contains', () => {
      expect(
        gqlToQueryBuilderHelper['transformCondition']('_contains', 'value'),
      ).toEqual(['$like', `%value%`]);
    });
  });
  describe('generateOrderByObject', () => {
    it('a direct field', () => {
      const entityName = 'User';
      const qb = orm.em.createQueryBuilder(entityName);
      const joinConfigs: any[] = [];
      const orderByInput = { name: 'asc' };
      const expectedOrderByObj = {
        name: 'asc',
      };
      const orderByObj = gqlToQueryBuilderHelper['generateOrderByObject'](
        qb,
        entityName,
        orderByInput,
        [],
      );
      expect(joinConfigs).toEqual([]);
      expect(orderByObj).toEqual(expectedOrderByObj);
    });
    it('a direct and a nested field', () => {
      const entityName = 'Todo';
      const qb = orm.em.createQueryBuilder(entityName);
      const joinConfigs: any[] = [];
      const orderByInput = { name: 'asc', assignee: { name: 'desc' } };
      const expectedOrderByObj = {
        name: 'asc',
        'e1.name': 'desc',
      };
      const orderByObj = gqlToQueryBuilderHelper['generateOrderByObject'](
        qb,
        entityName,
        orderByInput,
        joinConfigs,
      );
      expect(joinConfigs).toHaveLength(1);
      expect(orderByObj).toEqual(expectedOrderByObj);
    });
  });
  describe('generateWhereObj', () => {
    it('one field with _eq operator', () => {
      const entityName = 'User';
      const qb = orm.em.createQueryBuilder(entityName);
      const value = 'carlos.rgn@gmail.com';
      const whereInput = { email: { _eq: value } };
      const expectedWhereObject = { $and: [{ email: { $eq: value } }] };
      const whereObj = gqlToQueryBuilderHelper['generateWhereObject'](
        qb,
        entityName,
        whereInput,
        [],
      );
      expect(whereObj).toEqual(expectedWhereObject);
    });
    it('one field with _contains operator', () => {
      const entityName = 'User';
      const qb = orm.em.createQueryBuilder(entityName);
      const value = 'Carlos';
      const whereInput = { email: { _contains: value } };
      const expectedWhereObject = {
        $and: [{ email: { $like: `%${value}%` } }],
      };
      const whereObj = gqlToQueryBuilderHelper['generateWhereObject'](
        qb,
        entityName,
        whereInput,
        [],
      );
      expect(whereObj).toEqual(expectedWhereObject);
    });
    it('two fields', () => {
      const entityName = 'User';
      const qb = orm.em.createQueryBuilder(entityName);
      const whereInput = {
        email: { _eq: 'email' },
        name: { _contains: 'name' },
      };
      const expectedWhereObject = {
        $and: [{ email: { $eq: 'email' } }, { name: { $like: '%name%' } }],
      };
      const whereObj = gqlToQueryBuilderHelper['generateWhereObject'](
        qb,
        entityName,
        whereInput,
        [],
      );
      expect(whereObj).toEqual(expectedWhereObject);
    });
    it('one field and one OR operator with two fields', () => {
      const entityName = 'User';
      const qb = orm.em.createQueryBuilder(entityName);
      const whereInput = {
        email: { _eq: '1' },
        _or: {
          email: { _eq: '2' },
          name: { _contains: '3' },
        },
      };
      const expectedWhereObject = {
        $and: [
          {
            email: { $eq: '1' },
          },
          {
            $or: [
              {
                email: { $eq: '2' },
              },
              {
                name: { $like: '%3%' },
              },
            ],
          },
        ],
      };
      const whereObj = gqlToQueryBuilderHelper['generateWhereObject'](
        qb,
        entityName,
        whereInput,
        [],
      );
      expect(whereObj).toEqual(expectedWhereObject);
    });
    it('one field and a relationship with one field', () => {
      const entityName = 'Todo';
      const qb = orm.em.createQueryBuilder(entityName);
      const whereInput = {
        name: { _contains: 'Carlos' },
        assignee: {
          email: { _eq: 'carlos.rgn@gmail.com' },
        },
      };
      const expectedWhereObject = {
        $and: [
          {
            name: {
              $like: '%Carlos%',
            },
          },
          {
            'e1.email': {
              $eq: 'carlos.rgn@gmail.com',
            },
          },
        ],
      };
      const joinConfigs: any[] = [];
      const whereObj = gqlToQueryBuilderHelper['generateWhereObject'](
        qb,
        entityName,
        whereInput,
        joinConfigs,
      );
      expect(joinConfigs).toHaveLength(1);
      expect(whereObj).toEqual(expectedWhereObject);
    });
    it('one field and a relationship with one OR operator with two fields', () => {
      const entityName = 'Todo';
      const qb = orm.em.createQueryBuilder(entityName);
      const whereInput = {
        name: { _contains: 'Carlos' },
        assignee: {
          _or: {
            email: { _eq: 'carlos.rgn@gmail.com' },
            name: { _contains: 'carlos' },
          },
        },
      };
      const expectedWhereObject = {
        $and: [
          { name: { $like: '%Carlos%' } },
          {
            $or: [
              { 'e1.email': { $eq: 'carlos.rgn@gmail.com' } },
              { 'e1.name': { $like: '%carlos%' } },
            ],
          },
        ],
      };
      const joinConfigs: any[] = [];
      const whereObj = gqlToQueryBuilderHelper['generateWhereObject'](
        qb,
        entityName,
        whereInput,
        joinConfigs,
      );
      expect(joinConfigs).toHaveLength(1);
      expect(whereObj).toEqual(expectedWhereObject);
    });
    it('one field and one OR operator with one field and two relationship fields', () => {
      const entityName = 'Todo';
      const qb = orm.em.createQueryBuilder(entityName);
      const whereInput = {
        name: { _contains: 'Carlos' },
        _or: {
          description: { _contains: 'some description' },
          assignee: {
            email: { _eq: 'carlos.rgn@gmail.com' },
            name: { _contains: 'carlos' },
          },
        },
      };
      const expectedWhereObject = {
        $and: [
          { name: { $like: '%Carlos%' } },
          {
            $or: [
              { description: { $like: '%some description%' } },
              { 'e1.email': { $eq: 'carlos.rgn@gmail.com' } },
              { 'e1.name': { $like: '%carlos%' } },
            ],
          },
        ],
      };
      const joinConfigs: any[] = [];
      const whereObj = gqlToQueryBuilderHelper['generateWhereObject'](
        qb,
        entityName,
        whereInput,
        joinConfigs,
      );
      expect(joinConfigs).toHaveLength(1);
      expect(whereObj).toEqual(expectedWhereObject);
    });
  });
});
