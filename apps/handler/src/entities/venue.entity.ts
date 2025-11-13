import type { IVenue } from "@semantic-web-concerts/core/interfaces";
import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsString, ValidateNested } from "class-validator";
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
