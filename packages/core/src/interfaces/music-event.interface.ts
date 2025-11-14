import type { IArtist } from "./artist.interface";
import type { ITicket } from "./ticket.interface";
import type { IVenue } from "./venue.interface";

/**
 * The music event.
 */
export interface IMusicEvent {
  /**
   * The name.
   */
  name: string;

  /**
   * The URL to the music event info.
   */
  url: string;

  /**
   * Artists performing on the concert.
   */
  artists: IArtist[];

  /**
   * Venues where the music event takes place.
   */
  venues: IVenue[];

  /**
   * The time admission will commence.
   */
  doorTime: Date | undefined;

  /**
   * The start date and time of the event in the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
   */
  startDate: Date;

  /**
   * The end date and time of the event in the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
   */
  endDate: Date | undefined;

  /**
   * The concert ticket info.
   */
  ticket: ITicket;
}
