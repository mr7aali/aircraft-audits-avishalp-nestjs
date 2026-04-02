import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  REQUIRE_PERMISSION_KEY,
  REQUIRE_ACTIVE_STATION_KEY,
} from '../constants/auth.constants.js';
import { PermissionAction } from '../constants/module-codes.js';
import { RequirePermissionMetadata } from '../decorators/require-permission.decorator.js';
import { AuthenticatedUser } from '../types/authenticated-user.type.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionMetadata = this.reflector.getAllAndOverride<
      RequirePermissionMetadata | undefined
    >(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    const requireActiveStation =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_ACTIVE_STATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (!permissionMetadata && !requireActiveStation) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    if (requireActiveStation && !user.activeStationId) {
      throw new ForbiddenException(
        'Active station is required for this operation',
      );
    }

    if (!permissionMetadata) {
      return true;
    }

    if (!user.activeStationId) {
      throw new ForbiddenException(
        'Active station is required for permission evaluation',
      );
    }

    const access = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId: user.id,
          stationId: user.activeStationId,
        },
      },
      include: {
        role: {
          include: {
            moduleAccesses: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });

    if (!access || !access.isActive || !access.role.isActive) {
      throw new ForbiddenException('No active station access');
    }

    const moduleAccess = access.role.moduleAccesses.find(
      (item) => item.module.code === permissionMetadata.moduleCode,
    );

    if (!moduleAccess) {
      throw new ForbiddenException('Permission denied');
    }

    const isAllowed = this.isAllowed(moduleAccess, permissionMetadata.action);

    if (!isAllowed) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }

  private isAllowed(
    moduleAccess: {
      canRead: boolean;
      canWrite: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canList: boolean;
      canView: boolean;
      canCreate: boolean;
    },
    action: PermissionAction,
  ) {
    switch (action) {
      case 'list':
      case 'view':
      case 'read':
        return (
          moduleAccess.canRead || moduleAccess.canList || moduleAccess.canView
        );
      case 'create':
      case 'write':
        return moduleAccess.canWrite || moduleAccess.canCreate;
      case 'edit':
        return moduleAccess.canEdit || moduleAccess.canCreate;
      case 'delete':
        return moduleAccess.canDelete || moduleAccess.canCreate;
      default:
        return false;
    }
  }
}
