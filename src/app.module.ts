import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreKitModule } from './corekit/corekit.module';
import { MissionsModule } from './plugins/missions/missions.module';
import { SurveyModule } from './plugins/survey/survey.module';
import { PermissionModule } from './plugins/permission/permission.module';
import { PersonModule } from './plugins/person/person.module';
import { UserModule } from './plugins/user/user.module';
import { FileModule } from './plugins/file/file.module';
import { NotificationModule } from './plugins/notification/notification.module';

@Module({
  imports: [
    // Database configuration
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'Odenza@2026',
      database: process.env.DB_DATABASE || 'GCPRO',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.DB_SYNC === 'true', // Only for development!
      logging: process.env.DB_LOGGING === 'true',
    }),
    // Core infrastructure
    CoreKitModule,
    // Business plugins
    MissionsModule,
    SurveyModule,
    PermissionModule,
    PersonModule,
    UserModule,
    FileModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
