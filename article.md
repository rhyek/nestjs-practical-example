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

```typescript
class TodoController {
  private todoService: TodoService;
  constructor(todoService: TodoService) {
    this.todoService = todoService;
  }
}
```

And the IoC container having `TodoService` registered with it, will handle that for you.

In our case, the primary use-case for this functionality is to facilitate decoupling certain aspects of our back-end. For example, we want to be able to separate our **business logic** from our **data persistence** so that by abstracting our data access we can at any time refactor one or the other, change what database we're using (from NoSQL to SQL, for example), or (as we'll see later on) swap in a **mock** during unit-tests, all the while not touching any business logic code. Having these characteristics in a project will greatly increase **testability**.

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

<div style="display: flex; flex-direction: row; justify-content: center;"><img src="https://carlosgonzalez.dev/wp-content/uploads/2020/06/initial-structure.png" height="300"/></div>

`apps/webapi/tsconfig.json`

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

## Repository-Unit of Work Pattern

According to Martin Fowler, the Repository Pattern can be described as:

> Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects.

This is the main reason we can easily make our business logic testable.
