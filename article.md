# NestJS, Layered Architecture, and TDD: A Short Walkthrough

## Introduction

I'm starting a series of articles that will demonstrate how to build a RESTful API in Node.js utilizing a Test-Driven Development (TDD) aproach, then in later publications the same app will serve as a base for implementing Continuous Integration (with Github Actions) and then finally Continuous Deployment with Infrastructure as Code (using Pulumi) targetting Azure and Kubernetes.

This first article will talk about NestJS which I think is currently the best choice for an enterprise-ready framework due to several reasons including a well-defined and documented assortment of features and best-practices for implementing tried-and-true software design patterns as solutions to common tasks and problems encountered when developing back-end applications. NestJS uses Express.js under the hood by default, so it's foundations are pretty solid.

We will build a simple back-end for a TODO app and by the end of this article, we will have seen what a typical project structure that enables/empowers TDD looks like including a **Layered Architecture**, **Repository and Unit Of Work pattern**, and **Dependency Injection**. I will try to provide some insight into specific approaches I take wherever it feels most useful.

The complete source code is available at https://github.com/rhyek/nestjs-practical-example.

## Table of Contents

- Overall Structure and Dependencies
- Initial Setup
- Layered Architecture
- Test-Driven Development
  - Unit Tests
  - Integration Tests

## Overall Structure and Dependencies

Since this project will serve as the base for future articles to come, and will include two or more applications or microservices. We will use a single git repository in the monorepo style so that we may have a single source of truth for everything from application source code (back and front-end), SQL migration files, to later on our CI/CD and IaC code. This is essentially using the [GitOps](https://www.gitops.tech/) pattern. In practice this also means pull requests, code reviews, issue tracking, integration and end-to-end (e2e) tests are easier to configure and/or manage.

The main dependencies for our exercise will include [TypeScript](https://www.typescriptlang.org/), [NestJS](https://nestjs.com/), [Jest](https://jestjs.io/) as our unit and integration test-runner (included in Nest), PostgreSQL, [MikroORM](https://mikro-orm.io/) for use in our data persistence abstraction layer, and [Docker Compose](https://docs.docker.com/compose/) to help us run our integration tests.

Although MikroORM provides SQL migration capabilities, we will delegate that responsibility to a separate application within our monorepo. We will not go into it in detail, however you can look at the source code to get an idea of how it's configured. That application will be invoked during our integration tests with docker-compose. More on that later.

## Initial Setup

```bash
mkdir -p nestjs-short-walkthrough/apps && cd $_
npm i -g @nestjs/cli
nest new webapi --package-manager npm
```

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
