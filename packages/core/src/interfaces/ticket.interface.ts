/**
 * Possible ticket availability options.
 */
export enum ItemAvailability {
  InStock = "InStock",
  SoldOut = "SoldOut",
}

/**
 * The ticket offer.
 */
export interface ITicket {
  /**
   * The URL to obtain the ticket.
   */
  url: string;

  /**
   * The availability of the ticket.
   */
  availability: ItemAvailability;
}
