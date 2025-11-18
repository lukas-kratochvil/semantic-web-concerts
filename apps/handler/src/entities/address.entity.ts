import type { IAddress } from "@semantic-web-concerts/core/interfaces";
import { IsISO31661Alpha2, IsOptional, IsString } from "class-validator";
import { RDFClass, RDFProperty } from "../rdf/decorators";
import { ns } from "../rdf/ontology";
import { AbstractEntity } from "./abstract.entity";

@RDFClass(ns.schema.PostalAddress)
export class AddressEntity extends AbstractEntity implements IAddress {
  @IsISO31661Alpha2()
  @RDFProperty(ns.schema.addressCountry)
  country: "CZ";

  @IsString()
  @RDFProperty(ns.schema.addressLocality)
  locality: string;

  @IsOptional()
  @IsString()
  @RDFProperty(ns.schema.streetAddress)
  street: string | undefined;
}
