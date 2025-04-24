import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigKeys } from './common/constant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>(ConfigKeys.PORT);

  const logLevel = configService.get(ConfigKeys.LOG_LEVEL).split(',');
  app.useLogger(logLevel.length > 1 ? logLevel : ['log', 'error', 'warn']);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: '*',
  });
  const config = new DocumentBuilder()
    .setTitle('Social Task API')
    .setDescription('API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/v1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  await app.listen(port);
}
bootstrap();
