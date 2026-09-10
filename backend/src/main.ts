import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist : true,
      transform : true
    })
  )

  app.enableCors({
    origin : [
      'http://localhost:3002'
    ]
  })
  
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
