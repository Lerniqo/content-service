import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { LoggerModule } from 'nestjs-pino';

@Module({
    imports: [LoggerModule.forRoot()],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
