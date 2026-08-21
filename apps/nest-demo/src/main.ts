import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    await app.listen(process.env.PORT ?? 3000);

    console.log(`Application is running on: ${await app.getUrl()}`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('Received SIGINT. Shutting down gracefully...');

        await app.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('Received SIGTERM. Shutting down gracefully...');

        await app.close();
        process.exit(0);
    });

    process.on("uncaughtException", err => {
        console.error('Uncaught Exception:', err);
    });
    process.on("unhandledRejection", reason => {
        console.error('Unhandled Rejection:', reason);
    });
}

bootstrap();