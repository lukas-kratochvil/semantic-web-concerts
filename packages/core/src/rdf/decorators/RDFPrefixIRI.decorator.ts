import { RDF_METADATA_KEYS } from "./metadata-keys";

export const RDFPrefixIRI = (iriPrefix: string): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(RDF_METADATA_KEYS.prefixIRI, iriPrefix, target);
  };
};
