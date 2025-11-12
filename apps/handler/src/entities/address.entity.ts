import { IsISO31661Alpha2, IsString } from "class-validator";

export class AddressEntity {
  @IsString()
  locality: string;

  @IsISO31661Alpha2()
  country: string;

  @IsString()
  street: string;
}
