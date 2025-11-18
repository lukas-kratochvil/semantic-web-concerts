import { IsArray, ArrayUnique, IsString, IsUrl } from "class-validator";
import type { IArtist } from "../interfaces";
import { RDFClass, RDFProperty } from "../rdf/decorators";
import { ns } from "../rdf/ontology";
import { AbstractEntity } from "./abstract.entity";

@RDFClass(ns.schema.MusicGroup)
export class ArtistEntity extends AbstractEntity implements IArtist {
  @IsString()
  @RDFProperty(ns.schema.name)
  name: string;

  @IsArray()
  @ArrayUnique<string>()
  @RDFProperty(ns.schema.genre, { discriminator: "language", language: "en" })
  genres: string[];

  @IsArray()
  @IsUrl(undefined, { each: true })
  @ArrayUnique<string>()
  @RDFProperty(ns.schema.sameAs, { discriminator: "datatype", datatype: ns.xsd.anyURI })
  sameAs: string[];
}
