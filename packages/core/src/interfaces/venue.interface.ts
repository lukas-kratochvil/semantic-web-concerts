import type { IAddress } from "./address.interface";

/**
 * The place where the concert is happening.
 */
export interface IVenue {
  /**
   * The name.
   */
  name: string;

  /**
   * The address.
   */
  address: IAddress | undefined;

  /**
   * The latitude of a location.
   */
  latitude: string | undefined;

  /**
   * The longitude of a location.
   */
  longitude: string | undefined;

  /**
   * Images of the venue.
   */
  // TODO: also add images?
  // images: string[];
}
