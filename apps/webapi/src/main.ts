import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // this handles SIGTERM which is useful in kubernetes environments
  await app.listen(3000);
}
bootstrap();
