import { RDF_METADATA_KEYS } from "./metadata-keys";

export const RDFClass = (iri: string): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(RDF_METADATA_KEYS.class, iri, target);
  };
};
