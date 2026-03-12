import { SetMetadata } from '@nestjs/common';
import { REQUIRE_PERMISSION_KEY } from '../constants/auth.constants.js';
import { ModuleCode, PermissionAction } from '../constants/module-codes.js';

export interface RequirePermissionMetadata {
  moduleCode: ModuleCode;
  action: PermissionAction;
}

export const RequirePermission = (
  moduleCode: ModuleCode,
  action: PermissionAction,
) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, {
    moduleCode,
    action,
  } satisfies RequirePermissionMetadata);
