/**
 * The address.
 */
export interface IAddress {
  /**
   * The country in 2-letter [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) format.
   *
   * Currently supporting only CZ.
   */
  country: "CZ";

  /**
   * The locality in which the street address is, and which is in the region (e.g. city).
   */
  locality: string;

  /**
   * The street address.
   */
  street: string | undefined;
}
