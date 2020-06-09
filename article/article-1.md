# Node.js, DI, Layered Architecture, and TDD: A Practical Example (Part 1)

## Introduction

I'm starting a two-part series of articles that will demonstrate how to build a RESTful API in Node.js utilizing a **Test-Driven Development (TDD)** approach. In future publications the same app will serve as a base for implementing Continuous Integration (with Github Actions) and then finally Continuous Deployment with Infrastructure as Code (using Pulumi) targeting Azure and Kubernetes.

This first article will talk about [NestJS](https://nestjs.com/) which I think is currently the best choice for an enterprise-ready back-end framework due reasons including a well-defined and documented assortment of features and best-practices for implementing tried-and-true software design patterns as solutions to common tasks and problems. NestJS uses [Express.js](https://expressjs.com/) under the hood by default, so it's foundation is pretty solid.

We will build a simple back-end for a TODO app and by the end of this article we will have seen what a typical project structure that enables/empowers TDD looks like while discussing concepts such as **Dependency Inversion**, **Layered Architecture**, and **Repository and Unit Of Work** along with some code samples. I will try to share some insight into specific approaches I take wherever it feels most useful.

While in this article we'll see examples of **Unit Tests**, **Test-Driven Development** and primarily **Integration Tests** with **Docker** will be the primary focus of the shorter part 2 of this series. Hopefully, this article will provide an adequate background and a good foundation to properly dive into TDD later on.

The complete source code is available at https://github.com/rhyek/nestjs-practical-example.

## Table of Contents

- [Overall Structure and Dependencies](#overall-structure-and-dependencies)
- [The "D" in SOLID (Dependency Inversion)](<#the-"d"-in-solid-(dependency-inversion)>)
  - [Dependency Injection in TypeScript](#dependency-injection-in-typescript)
- [Layered Architecture](#layered-architecture)
- [Initial Setup](#initial-setup)
- [Layer Implementations](#persistence-abstraction-layer)
  - [Persistence Abstraction Layer](#persistence-abstraction-layer)
    - [Repository Pattern](#repository-pattern)
    - [Unit of Work Pattern](#unit-of-work-pattern)
  - [Domain Layer: Service](#domain-layer-service)
  - [Application Layer: Controller](#application-layer-controller)
- [Conclusion](#conclusion)

## Overall Structure and Dependencies

Since this project will serve as the base for future articles to come, and will include two or more applications or microservices. We will use a single git repository in the monorepo style so that we may have a single source of truth for everything from application source code (back and perhaps in the future front-end), SQL migration files, to later on our CI/CD and IaC code. This is essentially using the [GitOps](https://www.gitops.tech/) pattern. In practice this also means pull requests, code reviews, issue tracking, integration and end-to-end (e2e) tests are easier to configure and/or manage.

The main dependencies for our exercise will include [TypeScript](https://www.typescriptlang.org/), [NestJS](https://nestjs.com/), [Jest](https://jestjs.io/) as our unit and integration test-runner (included in Nest), PostgreSQL, [MikroORM](https://mikro-orm.io/) for use in our data persistence abstraction layer, and [Docker Compose](https://docs.docker.com/compose/) to help us run our integration tests.

Although MikroORM provides SQL migration capabilities, we will delegate that responsibility to a separate application within our monorepo. We will not go into it in detail, however you can look at the source code to get an idea of how it's configured. That application will be invoked during our integration tests with docker-compose. More on that later.

## The "D" in SOLID (Dependency Inversion)

[SOLID](https://en.wikipedia.org/wiki/SOLID) is an acronym for a set of known software design principles, usually related to [Object-Oriented Programming (OOP)](https://en.wikipedia.org/wiki/Object-oriented_programming), that help with making your code maintainable and flexible. Relevant to this article is the last one: **Dependency Inversion**. It talks about keeping relationships between modules or objects abstracted by way of interfaces establishing clear boundaries and hiding away implementations, so that those objects are **loosely coupled**. Doing so allows you to change the implementation of any interface without requiring you to alter any code outside it. The inversion happens when both the client and provider in the dependent relationship now defer to the interface. This [article](https://dzone.com/articles/solid-principles-dependency-inversion-principle) offers a succinct example.

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

### Dependency Injection in TypeScript

Now, Dependency Injection is a bit different in TypeScript than what people with C# or Java backgrounds are used to. As disccused, dependency abstractions are done with interfaces and it is with those same interfaces that you register a provider in an IoC container. Something like:

```c#
ioc.register(IDatabaseService, DatabaseService);
```

As we all know, TypeScript compiles down to JavaScript and when this happens `interface` and `type` information is lost, so we can't use interfaces to register our providers, sadly. In JavaScript or TypeScript Dependency Injection libraries you will see that provider registration is done with either a string, a class, or a symbol.

Nevertheless, TypeScript offers an additional alternative: abstract classes. They are not lost during compilation (just converted to normal classes) and in TypeScript you can use abstract classes as interfaces as well as for inheritance. So you can either `implement` or `extend` an abstract class. This is how Dependency Injection is usually done in **Angular**. Again, this is just an alternative and it is not usually what you'll see in **NestJS**'s documentation, but it's there if you need it.

## Layered Architecture

Sometimes referred to as "Tiered Architecture", this pattern details a way for us to strictly identify aspects of our back-end applications that can be abstracted away with clear boundaries and are interrelated as a one-way chain of dependencies that ultimately satisfy user requests. This [article](https://dzone.com/articles/layered-architecture-is-good) provides a great run-down on the concept, but this is a good summary (ordered from high to low-level according to the **Dependency Inversion Principle**):
|Layer |Description|
|-------------|-|
|Presentation |Deals with presenting the UI to the user. In most modern systems, this layer is handled by a separate application that consumes the API, such as our TODO app.|
|Application |Usually located at the **edge** and functions as the entry-point for handling user requests. In our case, the application layer will be our controllers and endpoints. This layer is meant to be as lean as possible and its responsibilities are: <ul><li>executing access control policies (authentication, authorization, etc)</li><li>validating user input</li><li>dispatching calls or commands to the appropriate **Service** method</li><li>transforming service-returned entities to [Data Transfer Objects (DTOs)](https://en.wikipedia.org/wiki/Data_transfer_object) for output/serialization</li></ul>**No business logic should go here.**|
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
  providers: [AppService, TodoService],
  controllers: [AppController],
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
    private todoRepository: TodoRepository
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
          provide: TodoRepository,
          useValue: todoRepositoryMock,
        },
        TodoService,
      ],
    }).compile();

    todoRepository = module.get(TodoRepository);
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

Great! As you can see, we are replacing the `TodoRepository` dependency for our `TodoService` (which is our [System Under Test](https://en.wikipedia.org/wiki/System_under_test) or SUT) by providing a Jest mock to the test module's IoC container. As mentioned earlier, in TypeScript the tokens used for registering providers can vary in type allowing us to use strings, classes, or symbols. In this case you can see the token used to register and/or replace `TodoRepository` is itself.

One important thing to consider is that our use of `EntityManager` for transactions in `TodoService` and especially the way we mocked some of its methods (`getRepository`, `transactional`) in our unit tests potentially violates one principle of TDD: [Don't mock what you don't own](https://github.com/testdouble/contributing-tests/wiki/Don't-mock-what-you-don't-own). We will discuss that further in part 2 of this series.

Now when we run our tests with `npm run test`, we should see the following output:

<div style="display: flex; flex-direction: row; justify-content: center;"><img src="https://carlosgonzalez.dev/wp-content/uploads/2020/06/first-unit-tests-1.png" height="200"/></div>

Excellent. You can see examples of more test cases on github.

## Application Layer: Controller

Lastly, let's generate our `TodoController`:

```bash
nest g controller todo todos --flat
```

This will generate two files for us:

- `src/todos/todo.controller.ts`
- `src/todos/todo.controller.spec.ts`

If you check `src/app.module.ts`, you'll see that Nest automatically added `TodoController` to our module:

```ts
@Module({
  imports: [],
  providers: [AppService, TodoService],
  controllers: [AppController, TodoController],
})
export class AppModule {}
```

Our `TodoController` is empty at the moment. Let's add a couple of endpoints. Remember that service methods can be called by many or no controller endpoints (internal use) or even other services. In our case we are matching service methods to controller endpoints for demonstration purposes.

`src/todos/todo.controller.ts`:

```ts
import { Controller, Get, Post, Patch, Body, Param } from "@nestjs/common";
import { TodoService } from "./todo.service";
import { TodoCreateDTO } from "./dtos/todo-create.dto";
import { TodoGetDTO } from "./dtos/todo-get.dto";
import { AssignToParams } from "./params/assign-to.params";

@Controller("todo")
export class TodoController {
  constructor(private todoService: TodoService) {}

  @Get()
  async findAll(): Promise<TodoGetDTO[]> {
    const todos = await this.todoService.findAll();
    const dtos = todos.map((todo) => {
      const { id, name, description, assignee, created_at } = todo;
      return {
        id,
        name,
        description,
        assignee,
        createdAt: created_at,
      };
    });
    return dtos;
  }

  @Post()
  async create(@Body() values: TodoCreateDTO): Promise<TodoGetDTO> {
    const todo = await this.todoService.create(values);
    const { id, name, description, assignee, created_at } = todo;
    const dto: TodoGetDTO = {
      id,
      name,
      description,
      assignee,
      createdAt: created_at,
    };
    return dto;
  }

  @Patch(":id/assign-to/:assignee")
  async assignTo(
    @Param() { id, assignee: newAssignee }: AssignToParams
  ): Promise<void> {
    await this.todoService.assignTo(id, newAssignee);
  }
}
```

In this controller we are demonstrating some of the responsabilities of the application layer mentioned earlier. Our `create` method validates user input by using the DTO validation schema defined as `TodoCreateDTO`. All controller methods are invoking a method on the `TodoService` and in doing so we are delagating all business logic to it. Lastly, both `findAll` and `create` are transforming the domain objects returned by the services methods to a DTO ready for serialization and transport.

`TodoCreateDTO` was defined earlier. Let's now see what `TodoGetDTO` looks like.

`src/todos/dtos/todo-get.dto.ts`:

```ts
import { IsUUID, IsNotEmpty, IsOptional } from "class-validator";

export class TodoGetDTO {
  @IsUUID()
  id: string;
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  description: string;
  @IsOptional()
  assignee: string | null;
  @IsNotEmpty()
  createdAt: Date;
}
```

Great. I recommend defining unit tests for DTO validation schemas that are used directly run validations and/or transformatios at runtime. `TodoGetDTO` is not used like that. The reason I defined it as a validation schema at all is because I want to use it for validation in my unit tests to make sure my controller endpoints are transforming my domain objects correctly. Let's take a look at that.

```bash
npm i uuid @types/uuid
```

`src/todos/todo.controller.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { v4 as uuid } from "uuid";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { Todo } from "./todo.entity";
import { TodoService } from "./todo.service";
import { TodoController } from "./todo.controller";
import { TodoGetDTO } from "./dtos/todo-get.dto";

describe("TodoController", () => {
  let todoService: jest.Mocked<TodoService>;
  let todoController: TodoController;

  beforeEach(async () => {
    const todoServiceMock: Partial<TodoService> = {
      findAll: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TodoService,
          useValue: todoServiceMock,
        },
        TodoController,
      ],
    }).compile();

    todoService = module.get(TodoService);
    todoController = module.get<TodoController>(TodoController);
  });

  it("should be defined", () => {
    expect(todoController).toBeDefined();
  });

  it("findAll should convert domain objects returned from service to DTOs", async () => {
    const todos: Todo[] = [
      {
        id: uuid(),
        name: "name",
        description: "description",
        assignee: null,
        created_at: new Date(),
      },
      {
        id: uuid(),
        name: "name",
        description: "description",
        assignee: "assignee",
        created_at: new Date(),
      },
    ];
    todoService.findAll.mockResolvedValue(todos);
    const dtos = (await todoController.findAll()).map((pojo) =>
      plainToClass(TodoGetDTO, pojo)
    );
    for (const dto of dtos) {
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors).toHaveLength(0);
    }
  });
});
```

So here we can see that, similar to what we did earlier, we are mocking the dependencies of our SUT. For `TodoController` we have only one dependency we're interested in mocking. The interesting bit here is you could easily just mock `TodoRepository` again and provide that and use the real `TodoService` which would paint a closer picture for a real world scenario. We'd have `TodoRepository (mock)` -> `TodoService (real)` -> `TodoController (System Under Test)` all automatically injected by NestJS. Mocks are usually reserved for dependencies that are external to our project's scope, things that require network or file IO, etc, anything that makes it harder to implement our tests. `TodoService` does not fit that description well.

Another common approach, and the one being shown here, is to just mock anything in our project's scope that is external to our System Under Test.

One thing we should be interested in testing is user input validation for our `create` method. As mentioned earlier, I've written unit tests for `TodoCreateDTO` at `https://github.com/rhyek/nestjs-practical-example/blob/master/apps/webapi/src/todos/dtos/todo-create.dto.spec.ts`. Those should be sufficient to test the validation schema in an isolated manner, but we may want to test the whole [Chain of Responsability](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern) in a more real-world scenario together as a whole. Something like making an HTTP request to an endpoint and make sure all access policies are applied, user validation is done, proper HTTP exceptions are raised when necessary, etc.

On the other hand, calling our controller's `create` method directly in our unit tests does not execute any of that pipeline. It doesn't even validate input.

The only way to test that pipeline is with **Integration Tests** which we will look at in the next article in this series.

Ok, now if we run our tests again with `npm run test` we should see the following:

<div style="display: flex; flex-direction: row; justify-content: center;"><img src="https://carlosgonzalez.dev/wp-content/uploads/2020/06/second-unit-tests.png" height="200"/></div>

## Conclusion

Hoorah! and Phew! That was a bit of a long one. Hopefully, after having read this article going through some concepts and looking at some sample code, you will have a better understanding of what a good back-end application architecture needs in order to provide good maintainability, flexibility, and testability.

We went over a few subjects such as **Dependency Inversion**, **Layered Architecture**, gained useful background knowledge, build a solid architecture foundation and in part 2 of this series we will focus a little on **Test-Driven Development** but especially how we can set up **Integration Testing** using **Docker** for our project. Hope to see you there!
