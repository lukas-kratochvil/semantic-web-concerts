import { RDF_METADATA_KEYS } from "./metadata-keys";

type RDFPropertyOptions<TFieldType extends string> =
  | {
      /**
       * Indicates that the property has a datatype literal value. Cannot be used together with `language`.
       */
      discriminator: "datatype";
      /**
       * Datatype IRI of the literal value.
       */
      datatype: string;
    }
  | {
      /**
       * Indicates that the property has a language-tagged literal value. Cannot be used together with `datatype`.
       */
      discriminator: "language";
      /**
       * Language tag of the literal value in [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes) format.
       */
      language: string;
    }
  | {
      /**
       * Indicates that the property is an enumeration value.
       */
      discriminator: "enum";
      /**
       * Mapping of enum values to their corresponding IRIs.
       */
      map: Record<TFieldType, string>;
    };

export type RDFPropertyMetadata<TFieldType extends string = string> = {
  iri: string;
  options?: RDFPropertyOptions<TFieldType>;
};

export const RDFProperty = <TFieldType extends string = string>(
  iri: string,
  options?: RDFPropertyOptions<TFieldType>
): PropertyDecorator => {
  return (target, propertyKey) => {
    const metadataValue: RDFPropertyMetadata<TFieldType> = { iri, options };
    Reflect.defineMetadata(RDF_METADATA_KEYS.property, metadataValue, target.constructor, propertyKey);
  };
};
