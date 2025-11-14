import type { IMusicEvent } from "@semantic-web-concerts/core/interfaces";
import { Type } from "class-transformer";
import { Allow, ArrayNotEmpty, ArrayUnique, IsArray, IsString, IsUrl, ValidateNested } from "class-validator";
import { IsDateEqualOrMoreInFutureThan, IsDateMoreInFutureThan, IsFutureDate } from "../validation/decorators";
import { ArtistEntity } from "./artist.entity";
import { TicketEntity } from "./ticket.entity";
import { VenueEntity } from "./venue.entity";

export class MusicEventEntity implements IMusicEvent {
  @IsString()
  name: string;

  @IsUrl()
  url: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique<ArtistEntity>((elem) => elem.name)
  @ValidateNested({ each: true })
  @Type(() => ArtistEntity)
  artists: ArtistEntity[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique<VenueEntity>((elem) => elem.name)
  @ValidateNested({ each: true })
  @Type(() => VenueEntity)
  venues: VenueEntity[];

  @Allow() // only to satisfy this rule "@darraghor/nestjs-typed/all-properties-are-whitelisted", because it does not recognize custom validators implemented with class-validator
  @IsFutureDate()
  @Type(() => Date)
  doorTime: Date;

  @Allow() // only to satisfy this rule "@darraghor/nestjs-typed/all-properties-are-whitelisted", because it does not recognize custom validators implemented with class-validator
  @IsFutureDate()
  @Type(() => Date)
  startDate: Date;

  @Allow() // only to satisfy this rule "@darraghor/nestjs-typed/all-properties-are-whitelisted", because it does not recognize custom validators implemented with class-validator
  @IsFutureDate()
  @IsDateMoreInFutureThan("startDate")
  @Type(() => Date)
  endDate: Date;

  @ValidateNested()
  @Type(() => TicketEntity)
  ticket: TicketEntity;
}
