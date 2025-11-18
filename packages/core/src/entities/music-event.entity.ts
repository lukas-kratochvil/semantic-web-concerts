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
import type { IMusicEvent } from "../interfaces";
import { RDFClass, RDFProperty } from "../rdf/decorators";
import { ns } from "../rdf/ontology";
import { IsDateEqualOrMoreInFutureThan, IsDateMoreInFutureThan, IsFutureDate } from "../validation";
import { AbstractEntity } from "./abstract.entity";
import { ArtistEntity } from "./artist.entity";
import { TicketEntity } from "./ticket.entity";
import { VenueEntity } from "./venue.entity";

@RDFClass(ns.schema.MusicEvent)
export class MusicEventEntity extends AbstractEntity implements IMusicEvent {
  @IsString()
  @RDFProperty(ns.schema.name)
  name: string;

  @IsUrl()
  @RDFProperty(ns.schema.url, { discriminator: "datatype", datatype: ns.xsd.anyURI })
  url: string;

  @Type(() => ArtistEntity)
  @IsArray()
  @ArrayUnique<ArtistEntity>((elem) => elem.name)
  @ValidateNested({ each: true })
  @RDFProperty(ns.schema.performer)
  artists: ArtistEntity[];

  @Type(() => VenueEntity)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique<VenueEntity>((elem) => elem.name)
  @ValidateNested({ each: true })
  @RDFProperty(ns.schema.location)
  venues: VenueEntity[];

  @Type(() => Date)
  @IsOptional()
  @IsFutureDate()
  @RDFProperty(ns.schema.doorTime, { discriminator: "datatype", datatype: ns.xsd.dateTime })
  doorTime: Date | undefined;

  @Type(() => Date)
  @Allow() // only to satisfy "@darraghor/nestjs-typed/all-properties-are-whitelisted" rule, because it does not recognize custom validators implemented with class-validator as class-validator's decorators
  @IsFutureDate()
  @IsDateEqualOrMoreInFutureThan<MusicEventEntity>("doorTime")
  @RDFProperty(ns.schema.startDate, { discriminator: "datatype", datatype: ns.xsd.dateTime })
  startDate: Date;

  @Type(() => Date)
  @IsOptional()
  @IsFutureDate()
  @IsDateMoreInFutureThan<MusicEventEntity>("startDate")
  @RDFProperty(ns.schema.endDate, { discriminator: "datatype", datatype: ns.xsd.dateTime })
  endDate: Date | undefined;

  @Type(() => TicketEntity)
  @ValidateNested()
  @RDFProperty(ns.schema.offers)
  ticket: TicketEntity;
}
