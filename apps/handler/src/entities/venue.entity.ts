import type { IVenue } from "@semantic-web-concerts/core/interfaces";
import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsString, ValidateIf, ValidateNested } from "class-validator";
import { AddressEntity } from "./address.entity";

export class VenueEntity implements IVenue {
  @IsString()
  name: string;

  @ValidateIf((venue: IVenue) => venue.address === undefined || venue.longitude !== undefined)
  @IsString()
  @IsLatitude()
  latitude: string | undefined;

  @ValidateIf((venue: IVenue) => venue.address === undefined || venue.latitude !== undefined)
  @IsString()
  @IsLongitude()
  longitude: string | undefined;

  @ValidateIf(
    (venue: IVenue) => venue.address !== undefined || venue.latitude === undefined || venue.longitude === undefined
  )
  @ValidateNested()
  @Type(() => AddressEntity)
  address: AddressEntity | undefined;
}
