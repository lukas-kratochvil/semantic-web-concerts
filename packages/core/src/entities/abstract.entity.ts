import { IsUUID } from "class-validator";
import { uuidv7 } from "uuidv7";
import { RDFPrefixIRI, RDFProperty } from "../rdf/decorators";
import { ns, prefixes } from "../rdf/ontology";

@RDFPrefixIRI(prefixes.mec)
export abstract class AbstractEntity {
  constructor() {
    this.id = uuidv7();
  }

  @IsUUID(7)
  @RDFProperty(ns.schema.identifier)
  id: string;
}
