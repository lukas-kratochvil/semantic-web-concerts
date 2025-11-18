import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsString, ValidateIf, ValidateNested } from "class-validator";
import type { IVenue } from "../interfaces";
import { RDFClass, RDFProperty } from "../rdf/decorators";
import { ns } from "../rdf/ontology";
import { AbstractEntity } from "./abstract.entity";
import { AddressEntity } from "./address.entity";

@RDFClass(ns.schema.Place)
export class VenueEntity extends AbstractEntity implements IVenue {
  @IsString()
  @RDFProperty(ns.schema.name)
  name: string;

  @ValidateIf((venue: IVenue) => venue.address === undefined || venue.longitude !== undefined)
  @IsLatitude()
  @RDFProperty(ns.schema.latitude, { discriminator: "datatype", datatype: ns.xsd.decimal })
  latitude: number | undefined;

  @ValidateIf((venue: IVenue) => venue.address === undefined || venue.latitude !== undefined)
  @IsLongitude()
  @RDFProperty(ns.schema.longitude, { discriminator: "datatype", datatype: ns.xsd.decimal })
  longitude: number | undefined;

  @ValidateIf(
    (venue: IVenue) => venue.address !== undefined || venue.latitude === undefined || venue.longitude === undefined
  )
  @Type(() => AddressEntity)
  @ValidateNested()
  @RDFProperty(ns.schema.address)
  address: AddressEntity | undefined;
}
