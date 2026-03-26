import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AttachmentKind,
  CallType,
  LocationType,
  MessageType,
} from '../../../generated/prisma-client/enums.js';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MessageAttachmentDto {
  @ApiProperty()
  @IsUUID()
  fileId!: string;

  @ApiProperty({ enum: AttachmentKind })
  @IsEnum(AttachmentKind)
  kind!: AttachmentKind;
}

export class PollOptionInputDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  text!: string;
}

export class PollInputDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  question!: string;

  @ApiProperty()
  @IsBoolean()
  allowMultipleAnswers!: boolean;

  @ApiProperty({ type: [PollOptionInputDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PollOptionInputDto)
  options!: PollOptionInputDto[];
}

export class EventInputDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  eventName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationText?: string;

  @ApiPropertyOptional({ enum: CallType })
  @IsOptional()
  @IsEnum(CallType)
  callType?: CallType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callLinkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reminderOffsetMinutes?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowGuests?: boolean;
}

export class LocationInputDto {
  @ApiProperty({ enum: LocationType })
  @IsEnum(LocationType)
  locationType!: LocationType;

  @ApiProperty()
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  liveExpiresAt?: string;
}

export class ContactInputDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  contactName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(30)
  contactPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

export class SendMessageDto {
  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  messageType!: MessageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encryptedPayload?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  previewText?: string;

  @ApiPropertyOptional({ type: [MessageAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];

  @ApiPropertyOptional({ type: PollInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PollInputDto)
  poll?: PollInputDto;

  @ApiPropertyOptional({ type: EventInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventInputDto)
  event?: EventInputDto;

  @ApiPropertyOptional({ type: LocationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationInputDto)
  location?: LocationInputDto;

  @ApiPropertyOptional({ type: ContactInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInputDto)
  contact?: ContactInputDto;
}

export class MessageReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class PollVoteDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  optionIds!: string[];
}

