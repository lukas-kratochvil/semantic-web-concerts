import type { ItemAvailability } from "@semantic-web-concerts/core/interfaces";
import { rdf, schema, xsd } from "rdf-namespaces";

export const prefixes = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  schema: "http://schema.org/",
  swc: "http://semantic-web-concerts.cz/entity/",
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

type SchemaItemAvailabilityEnum = {
  [K in ItemAvailability]: `${typeof prefixes.schema}${K}`;
};

const schemaItemAvailabilityEnum: SchemaItemAvailabilityEnum = {
  InStock: `${prefixes.schema}InStock`,
  SoldOut: `${prefixes.schema}SoldOut`,
} as const;

type SchemaOrg = SchemaTypes & SchemaProperties & SchemaItemAvailabilityEnum;

export const ns = {
  rdf,
  schema: {
    ...schemaItemAvailabilityEnum,
    ...schema,
  } as SchemaOrg,
  xsd,
} satisfies Record<keyof Omit<typeof prefixes, "swc">, object>;
