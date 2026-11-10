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

  // Allowed frontends (comma-separated), e.g. platform admin :3002, seller admin :3001
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3002,http://localhost:3001')
    .split(',').map((o) => o.trim()).filter(Boolean)
  app.enableCors({ origin: origins })
  
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
