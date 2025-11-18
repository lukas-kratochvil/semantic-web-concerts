import type { IVenue } from "@semantic-web-concerts/core/interfaces";
import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsString, ValidateIf, ValidateNested } from "class-validator";
import { AbstractEntity } from "./abstract.entity";
import { AddressEntity } from "./address.entity";

export class VenueEntity extends AbstractEntity implements IVenue {
  @IsString()
  name: string;

  @ValidateIf((venue: IVenue) => venue.address === undefined || venue.longitude !== undefined)
  @IsLatitude()
  latitude: number | undefined;

  @ValidateIf((venue: IVenue) => venue.address === undefined || venue.latitude !== undefined)
  @IsLongitude()
  longitude: number | undefined;

  @ValidateIf(
    (venue: IVenue) => venue.address !== undefined || venue.latitude === undefined || venue.longitude === undefined
  )
  @Type(() => AddressEntity)
  @ValidateNested()
  address: AddressEntity | undefined;
}
