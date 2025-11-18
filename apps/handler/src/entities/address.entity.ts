import type { IAddress } from "@semantic-web-concerts/core/interfaces";
import { IsISO31661Alpha2, IsOptional, IsString } from "class-validator";
import { AbstractEntity } from "./abstract.entity";

export class AddressEntity extends AbstractEntity implements IAddress {
  @IsISO31661Alpha2()
  country: "CZ";

  @IsString()
  locality: string;

  @IsOptional()
  @IsString()
  street: string | undefined;
}
