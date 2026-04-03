import { PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SYSTEM_TYPES,
  type SystemType,
} from '../../../common/constants/module-codes.js';

export class AccessControlListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(Object.values(SYSTEM_TYPES))
  systemType?: SystemType;
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class UpdateRolePermissionItemDto {
  @IsString()
  @IsNotEmpty()
  moduleCode!: string;

  @IsBoolean()
  canRead!: boolean;

  @IsBoolean()
  canWrite!: boolean;

  @IsBoolean()
  canEdit!: boolean;

  @IsBoolean()
  canDelete!: boolean;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => UpdateRolePermissionItemDto)
  permissions!: UpdateRolePermissionItemDto[];
}

export class AssignUserRoleDto {
  @IsUUID()
  roleId!: string;
}
