import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsString, ValidateNested } from "class-validator";
import type { IVenue } from "../interfaces/venue.interface";
import { AddressEntity } from "./address.entity";

export class VenueEntity implements IVenue {
  @IsString()
  name: string;

  @IsString()
  @IsLatitude()
  latitude: string;

  @IsString()
  @IsLongitude()
  longitude: string;

  @ValidateNested()
  @Type(() => AddressEntity)
  address: AddressEntity;
}
