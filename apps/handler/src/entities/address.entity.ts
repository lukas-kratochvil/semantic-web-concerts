import type { IAddress } from "@semantic-web-concerts/core/interfaces";
import { IsISO31661Alpha2, IsString } from "class-validator";
import { RDFClass, RDFProperty } from "../rdf/decorators";
import { schemaOrg } from "../rdf/vocabulary";

@RDFClass(schemaOrg.PostalAddress)
export class AddressEntity implements IAddress {
  @RDFProperty(schemaOrg.addressLocality)
  @IsString()
  locality: string;

  @RDFProperty(schemaOrg.addressCountry)
  @IsISO31661Alpha2()
  country: "CZ";

  @RDFProperty(schemaOrg.streetAddress)
  @IsString()
  street: string;
}
