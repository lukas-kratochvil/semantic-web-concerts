import type { StrictOmit } from "@music-event-connect/shared";
import { rdf, schema, xsd } from "rdf-namespaces";
import type { ItemAvailability } from "../interfaces";

/**
 * RDF prefixes used in the project.
 */
export const prefixes = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  schema: "http://schema.org/",
  mec: "http://music-event-connect.cz/entity/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
} as const;

type SchemaTypes = Pick<typeof schema, "MusicEvent" | "MusicGroup" | "Offer" | "Place" | "PostalAddress">;

type SchemaProperties = Pick<
  typeof schema,
  // Thing properties
  | "identifier"
  | "name"
  | "sameAs"
  | "url"

  // MusicEvent properties
  | "performer"
  | "location"
  | "doorTime"
  | "startDate"
  | "endDate"
  | "offers"

  // MusicGroup properties
  | "genre"

  // Offer properties
  | "availability"

  // Place properties
  | "address"
  | "latitude"
  | "longitude"

  // PostalAddress properties
  | "addressCountry"
  | "addressLocality"
  | "streetAddress"
>;

/**
 * ItemAvailability enum values subset (they are missing in `rdf-namespaces` package).
 * @see https://schema.org/ItemAvailability
 */
type SchemaItemAvailabilityEnum = {
  [K in ItemAvailability]: `${typeof prefixes.schema}${K}`;
};

const schemaItemAvailabilityEnum: SchemaItemAvailabilityEnum = {
  InStock: `${prefixes.schema}InStock`,
  SoldOut: `${prefixes.schema}SoldOut`,
} as const;

/**
 * [Schema.org](https://schema.org/) vocabulary subset used in the project.
 */
type SchemaSubset = SchemaTypes & SchemaProperties & SchemaItemAvailabilityEnum;

/**
 * RDF namespaces used in the project.
 */
export const ns = {
  rdf,
  schema: {
    ...schemaItemAvailabilityEnum,
    ...schema,
  } as SchemaSubset,
  xsd,
} satisfies Record<keyof StrictOmit<typeof prefixes, "mec">, object>;
