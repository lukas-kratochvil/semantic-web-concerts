import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsString, ValidateNested } from "class-validator";
import { AddressEntity } from "./address.entity";

export class VenueEntity {
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
