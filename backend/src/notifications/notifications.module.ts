import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Global()
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule { }
