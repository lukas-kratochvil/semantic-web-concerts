export const ItemAvailability = {
  InStock: "InStock",
  SoldOut: "SoldOut",
} as const;

/**
 * Possible ticket availability options.
 */
export type ItemAvailability = (typeof ItemAvailability)[keyof typeof ItemAvailability];

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
