# Node.js, DI, Layered Architecture, and TDD: A Short Walk-through

## Introduction

I'm starting a series of articles that will demonstrate how to build a RESTful API in Node.js utilizing a Test-Driven Development (TDD) approach. In later publications the same app will serve as a base for implementing Continuous Integration (with Github Actions) and then finally Continuous Deployment with Infrastructure as Code (using Pulumi) targeting Azure and Kubernetes.

This first article will talk about [NestJS](https://nestjs.com/) which I think is currently the best choice for an enterprise-ready back-end framework due reasons including a well-defined and documented assortment of features and best-practices for implementing tried-and-true software design patterns as solutions to common tasks and problems. NestJS uses Express.js under the hood by default, so it's foundation is pretty solid.

We will build a simple back-end for a TODO app and by the end of this article we will have seen what a typical project structure that enables/empowers TDD looks like including concepts such as **Dependency Inversion**, **Layered Architecture**, and **Repository and Unit Of Work**. I will try to provide some insight into specific approaches I take wherever it feels most useful.

The complete source code is available at https://github.com/rhyek/nestjs-practical-example.

## Table of Contents

- Overall Structure and Dependencies
- The "D" in SOLID
- Layered Architecture
- Test-Driven Development
- Initial Setup

## Overall Structure and Dependencies

Since this project will serve as the base for future articles to come, and will include two or more applications or microservices. We will use a single git repository in the monorepo style so that we may have a single source of truth for everything from application source code (back and front-end), SQL migration files, to later on our CI/CD and IaC code. This is essentially using the [GitOps](https://www.gitops.tech/) pattern. In practice this also means pull requests, code reviews, issue tracking, integration and end-to-end (e2e) tests are easier to configure and/or manage.

The main dependencies for our exercise will include [TypeScript](https://www.typescriptlang.org/), [NestJS](https://nestjs.com/), [Jest](https://jestjs.io/) as our unit and integration test-runner (included in Nest), PostgreSQL, [MikroORM](https://mikro-orm.io/) for use in our data persistence abstraction layer, and [Docker Compose](https://docs.docker.com/compose/) to help us run our integration tests.

Although MikroORM provides SQL migration capabilities, we will delegate that responsibility to a separate application within our monorepo. We will not go into it in detail, however you can look at the source code to get an idea of how it's configured. That application will be invoked during our integration tests with docker-compose. More on that later.

## The "D" in SOLID (Dependency Inversion)

[SOLID](https://en.wikipedia.org/wiki/SOLID) is an acronym for a set of known software design principles, usually related to OOP, that help with making your code maintainable and flexible. Relevant to this article is the last one: **Dependency Inversion**. It talks about keeping relationships between modules or objects abstracted by way of interfaces establishing clear boundaries and hiding away implementations, so that those objects are **loosely coupled**. Doing so allows you to change the implementation of any interface without requiring you to alter any code outside it. The inversion happens when both the client and provider in the dependent relationship now defer to the interface. This [article](https://dzone.com/articles/solid-principles-dependency-inversion-principle) offers a succinct example.

The principle goes further on to say that the interfaces are defined and owned by the client module (high-level) and the provider (low-level, the dependency) will then strictly adhere to this contract and not the other way around. This [article](https://devonblog.com/software-development/solid-violations-in-the-wild-the-dependency-inversion-principle/) offers a great explanation to this concept.

Based on all this, **Dependency Injection** is a way for a client to declaratively require a dependency, usually via a class constructor in OOP, which is then satisfied or _injected_ by an **Inversion of Control (IoC)** container (whose responsibility is to orchestrate these dependencies once providers are configured) during client instantiation. A framework such as NestJS provides this mechanism for you out of the box. For example, for a `TodoController` to have `TodoService` injected to it you would do this:

```ts
class TodoController {
  private todoService: TodoService;
  constructor(todoService: TodoService) {
    this.todoService = todoService;
  }
}
```

And the IoC container having `TodoService` registered with it, will handle that for you.

In our case, the primary use-case for this functionality is to facilitate decoupling certain aspects of our back-end. For example, we want to be able to separate our **business logic** from our **data persistence** so that by abstracting our data access we can at any time refactor one or the other, change what database we're using (from NoSQL to SQL, for example), or (as we'll see later on) swap in a **mock** during unit-tests, all the while not touching any business logic code. Having these characteristics in a project will greatly increase **testability**.

### Dependency Injection and TypeScript

Now, Dependency Injection is a bit different in TypeScript than what people with C# or Java backgrounds are used to. As disccused, dependency abstractions are usually done with interfaces and it is with those same interfaces that you register a provider in an IoC container. Something like:

```c#
ioc.register(IDatabaseService, DatabaseService);
```

As we all know, TypeScript compiles down to JavaScript and when this happens `interface` and `type` information is lost, so we can't use interfaces to register our providers, sadly. In JavaScript or TypeScript Dependency Injection libraries you will see that provider registration is done with either a string, a class, or a symbol.

Nevertheless, TypeScript offers an additional alternative: abstract classes. They are not lost during compilation and in TypeScript you can use abstract classes as interfaces as well as for inheritance. So you can either `implement` or `extend` an abstract class. This is how Dependency Injection is usually done in **Angular**. Again, this is just an alternative and it is not usually what you'll see in **NestJS**'s documentation, but it's there if you need it.

## Layered Architecture

Sometimes called referred to as "Tiered Architecture", this pattern details a way for us to strictly identify aspects of our back-end applications that can be abstracted away with clear boundaries and are interrelated as a one-way chain of dependencies that ultimately satisfy user requests. This [article](https://dzone.com/articles/layered-architecture-is-good) provides a great run-down on the concept, but this is a good summary (ordered from high to low-level according to the **Dependency Inversion Principle**):
|Layer |Description|
|-------------|-|
|Presentation |Deals with presenting the UI to the user. In most modern systems, this layer is handled by a separate application that consumes the API, such as our TODO app.|
|Application |Usually located at the **edge** and functions as the entry-point for handling user requests. In our case, the application layer will be our controllers and endpoints. This layer is meant to be as lean as possible and its responsibilities are: <ul> <li>validating user input</li><li>dispatching calls or commands to the appropriate **Service** method</li><li>transforming service-returned entities to [Data Transfer Objects (DTOs)](https://en.wikipedia.org/wiki/Data_transfer_object) for output/serialization</li></ul>**No business logic should go here.**|
|Domain |Contains all domain-level concerns such as business logic and **domain objects** (entities). Business logic is arranged into _services_ that provide methods that our controllers (or even other services) can call. These methods can receive either entities or DTOs as parameters, but should always return entities.<br />Transformation to DTOs should be done exclusively at the edge (our controllers), because that is where serialization happens and also because, depending on our project requirements, several controllers or services can call these methods and they will want to deal with the purest form of the data.<br />Direct data access is not done at this level. It is delegated to the next lower level abstraction that is the **Persistence Abstraction** layer.|
|Persistence |This is generally a persistence abstraction over the underlying infrastructure detail which can be any assortment of SQL or NoSQL databases or cloud storage services. This level serves as a mediator between that infrastructure detail and our domain.<br />The general way of abstracting data access here is using the **Repository and Unit of Work Patterns**. They go hand-in-hand. More on this later.|

_Note: For small projects, it is acceptable to combine our application and domain layers into one. This means our controllers could contain business logic and access our persistence abstractions directly. Nevertheless, it is important to maintain consistency throughout the project and if it grows in the future, refactoring could be difficult._

Ok, let's start building our TODO back-end!

## Initial Setup

Let's create our monorepo project and initialize our NestJS app:

```bash
mkdir -p todos/apps && cd $_
npm i -g @nestjs/cli
nest new webapi --package-manager npm
```

This will give use the following structure:

<div style="display: flex; flex-direction: row; justify-content: center;"><img src="https://carlosgonzalez.dev/wp-content/uploads/2020/06/initial-structure.png" height="350"/></div>

_Note: From this point on all commands and paths will be relative to the `todos/apps/webapi` folder._

Let's make a couple of changes to `tsconfig.json` so that TypeScript error checking is stricter and to allow for importing default exports from modules without star syntax:

```diff
{
  "compilerOptions": {
    "module": "commonjs",
    ...
    "outDir": "./dist",
-   "baseUrl": "./",
    "incremental": true,
+   "strict": true,
+   "strictPropertyInitialization": false,
+   "esModuleInterop": true
  }
}
```

Great. We will now begin building out our layered architecture and we'll be writing some unit tests along the way. We'll be tackling each layer in going down the dependency ladder.

## Persistence Abstraction Layer

Let's start by installing `mikro-orm` and defining our todo entity and repository.

```bash
npm i mikro-orm nestjs-mikro-orm pg
mkdir -p src/todos
touch src/todos/todo.entity.ts
touch src/todos/todo.repository.ts
```

Paste this into `src/todos/todo.entity.ts`:

```ts
import { Entity, PrimaryKey, Property } from "mikro-orm";

@Entity({ tableName: "todos" })
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
```

Paste this into `src/todos/todo.repository.ts`:

```ts
import { EntityRepository, Repository } from "mikro-orm";
import { Todo } from "./todo.entity";

@Repository(Todo)
export class TodoRepository extends EntityRepository<Todo> {
  // ready for any custom queries
}
```

### Repository Pattern

According to Martin Fowler, the Repository Pattern can be described as:

> Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects.

So a repository will generally have methods such as `findOne`, `findAll`, `remove`, and such. Your service layer will manipulate the collection through these repository methods. Their implementation is not a concern to our business logic.

Using this pattern is what enables us to easily unit-test our business logic by allowing us to mock the repository in an isolated manner. We'll see how that works later on.

In our case, `mikro-orm` already provides repositories for our entities so that we don't have to write those basic collection methods ourselves. As you can see, we are creating our own custom repository by extending `EntityRepository<Entity>` which will allow us to define any needed custom queries. Other than the basic collection methods, any custom query your serivce needs to run against your database should be written as a new method on the repository. For example, there could be a need for a `findAllCompletedTodos`.

It would also be possible to write the entire repository from scratch ourselves and still keep the same interface in a situation where we are not interested or are unable to use any ORM. This is why abstractions are so important.

### Unit of Work Pattern

One particular benefit of using an ORM such as `mikro-orm` is that aside from providing the repository functionality, it also provides the **Unit of Work** feature. Martin Fowler states the following about UoW:

> Maintains a list of objects affected by a business transaction and coordinates the writing out of changes and the resolution of concurrency problems.

What this means is that, for example, when using a SQL database if you manipulate your TODO collection via the repository multiple times within a transaction (say you're adding, deleting, modifying x amount of todos all in one go), the Unit of Work is tracking all those changes for you in memory without reaching out to your database saving you resource consumption. Once you commit your transaction (via `flush` in this case), the ORM will batch all the needed SQL queries together for you. This has important performance benefits.

The Unit Of Work will also track changes accross multiple repositories.

## Domain Layer: Service

Our next task is to write our `TodoService`:

```bash
nest g service todo todos --flat
```

This creates two files for us:

- `src/todos/todo.service.ts`
- `src/todos/todo.service.spec.ts`

All files ending in `.spec.ts` are considered to be unit-test suites.

If you check `src/app.module.ts`, you'll see that Nest automatically added `TodoService` to the IoC container for us:

```ts
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, TodoService],
})
export class AppModule {}
```

You'll notice we haven't registered or `TodoRepository` on it, yet. We'll get to that later.

Ok, let's paste this into `todo.service.ts`:

```ts
@Injectable()
export class TodoService {
  constructor(
    private em: EntityManager,
    @InjectRepository(Todo) private todoRepository: EntityRepository<Todo>
  ) {}

  async findAll(): Promise<Todo[]> {
    const todos = await this.todoRepository.findAll();
    return todos;
  }

  async create(values: TodoCreateDTO): Promise<Todo> {
    const { name, description } = values;
    const todo = new Todo(name, description);
    await this.todoRepository.persist(todo);
    await this.em.flush();
    return todo;
  }

  async assignTo(id: string, newAssignee: string): Promise<void> {
    await this.em.transactional(async (em) => {
      const todoRepository = em.getRepository(Todo);
      const todo = await todoRepository.findOneOrFail(id);
      const { assignee: currentAssignee } = todo;
      if (currentAssignee && currentAssignee !== newAssignee) {
        throw new BadRequestException("Todo is already assigned.");
      }
      todo.assignee = newAssignee;
      await em.flush();
    });
  }
}
```

`EntityManager` is essentially our Unit of Work. Now, let's define `TodoCreateDTO`:

```bash
npm i class-validator class-transformer
mkdir -p src/todos/dtos && touch src/todos/dtos/todo-create.dto.ts
```

`src/todos/dtos/todo-create.dto.ts`:

```ts
import { MaxLength } from "class-validator";

export class TodoCreateDTO {
  @MaxLength(50)
  name: string;
  @MaxLength(100)
  description: string;
}
```

As mentioned in this [article](https://en.wikipedia.org/wiki/Data_transfer_object) about DTOs, they are essentially serialized objects used to transfer data between two processes or systems. We will be placing any DTO used for either input or output at `src/todos/dtos`.

You can see I've written some unit tests for that DTO at https://github.com/rhyek/nestjs-practical-example/blob/master/apps/webapi/src/todos/dtos/todo-create.dto.spec.ts, but I will not include them here.

Let's write a couple of unit tests for our `TodoService` at `src/todos/todo.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { EntityManager } from "mikro-orm";
import { getRepositoryToken } from "nestjs-mikro-orm";
import { Todo } from "./todo.entity";
import { TodoRepository } from "./todo.repository";
import { TodoService } from "./todo.service";

describe("TodoService", () => {
  let todoRepository: jest.Mocked<TodoRepository>;
  let service: TodoService;

  beforeEach(async () => {
    const todoRepositoryMock = {
      findAll: jest.fn(),
      findOneOrFail: jest.fn(),
      persist: jest.fn(),
    };
    const entityManagerMock = {
      flush: jest.fn(),
      getRepository: jest.fn(() => todoRepositoryMock),
      transactional: jest.fn(async (cb) => {
        await cb(entityManagerMock);
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EntityManager,
          useValue: entityManagerMock,
        },
        {
          provide: getRepositoryToken(Todo),
          useValue: todoRepositoryMock,
        },
        TodoService,
      ],
    }).compile();

    todoRepository = module.get(getRepositoryToken(Todo));
    service = module.get<TodoService>(TodoService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("assignTo should throw BadRequestException when the todo has a different assignee", async () => {
    todoRepository.findOneOrFail.mockResolvedValue({
      id: "1",
      name: "name",
      description: "description",
      assignee: "assignee-a",
      created_at: new Date(),
    });
    await expect(service.assignTo("1", "assignee-b")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("assignTo should succeed for a known id and unassigned todo", async () => {
    todoRepository.findOneOrFail.mockResolvedValue({
      id: "1",
      name: "name",
      description: "description",
      assignee: null,
      created_at: new Date(),
    });
    await expect(service.assignTo("1", "assignee-a")).resolves.toBeUndefined();
  });
});
```

Great! As you can see, we are mocking the `TodoRepository` dependency for our service. Remember that unit tests should be independent of one another and execution order shouldn't matter. Also, every test has it's own mock setup.

Now when we run our tests with `npm run test`, we should see the following output:

<div style="display: flex; flex-direction: row; justify-content: center;"><img src="https://carlosgonzalez.dev/wp-content/uploads/2020/06/first-unit-tests.png" height="180"/></div>

Excellent. You can see examples of more test cases on github.

## Application Layer: Controller

Let's start by generating our `TodoController`:

```bash
nest g controller todo todos --flat
```

This will generate two files for us: `apps/webapi/src/todos/todo.controller.ts` and `apps/webapi/src/todos/todo.controller.spec.ts`. Any file ending in `.spec.ts` is considered a unit-test suite.

So far, our `TodoController` is an empty class. Let's add a couple of endpoints: `GET /` and `POST /`.

```typescript
```
