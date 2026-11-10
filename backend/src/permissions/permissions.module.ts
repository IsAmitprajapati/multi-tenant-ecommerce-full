import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service.js';
import { PermissionsGuard } from './permissions.guard.js';

/** Global so any module can use @RequirePermission without extra imports. */
@Global()
@Module({
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule { }
