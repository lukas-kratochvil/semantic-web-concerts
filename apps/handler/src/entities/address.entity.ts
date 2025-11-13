import { IsISO31661Alpha2, IsString } from "class-validator";
import type { IAddress } from "../interfaces/address.interface";

export class AddressEntity implements IAddress {
  @IsString()
  locality: string;

  @IsISO31661Alpha2()
  country: string;

  @IsString()
  street: string;
}
