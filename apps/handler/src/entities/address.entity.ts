import type { IAddress } from "@semantic-web-concerts/core/interfaces";
import { IsISO31661Alpha2, IsString } from "class-validator";

export class AddressEntity implements IAddress {
  @IsString()
  locality: string;

  @IsISO31661Alpha2()
  country: string;

  @IsString()
  street: string;
}
