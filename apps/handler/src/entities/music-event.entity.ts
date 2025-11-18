import type { IMusicEvent } from "@semantic-web-concerts/core/interfaces";
import { Type } from "class-transformer";
import {
  Allow,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";
import { IsDateEqualOrMoreInFutureThan, IsDateMoreInFutureThan, IsFutureDate } from "../validation/decorators";
import { ArtistEntity } from "./artist.entity";
import { TicketEntity } from "./ticket.entity";
import { VenueEntity } from "./venue.entity";

export class MusicEventEntity implements IMusicEvent {
  @IsString()
  name: string;

  @IsUrl()
  url: string;

  @Type(() => ArtistEntity)
  @IsArray()
  @ArrayUnique<ArtistEntity>((elem) => elem.name)
  @ValidateNested({ each: true })
  artists: ArtistEntity[];

  @Type(() => VenueEntity)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique<VenueEntity>((elem) => elem.name)
  @ValidateNested({ each: true })
  venues: VenueEntity[];

  @Type(() => Date)
  @IsOptional()
  @IsFutureDate()
  doorTime: Date | undefined;

  @Type(() => Date)
  @Allow() // only to satisfy this rule "@darraghor/nestjs-typed/all-properties-are-whitelisted", because it does not recognize custom validators implemented with class-validator
  @IsFutureDate()
  @IsDateEqualOrMoreInFutureThan("doorTime")
  startDate: Date;

  @Type(() => Date)
  @IsOptional()
  @IsFutureDate()
  @IsDateMoreInFutureThan("startDate")
  endDate: Date | undefined;

  @Type(() => TicketEntity)
  @ValidateNested()
  ticket: TicketEntity;
}
