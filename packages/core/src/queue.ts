/**
 * Concert events queue metadata.
 */
export const ConcertEventsQueue = {
  name: "concert-events",
  jobs: {
    goout: "goout",
    ticketmaster: "ticketmaster",
    ticketportal: "ticketportal",
  },
} as const;

/**
 * Concert event queue job name type.
 */
export type ConcertEventsQueueNameType = keyof (typeof ConcertEventsQueue)["jobs"];

/**
 * Artist entity.
 */
type Artist = {
  name: string;
  country: string | undefined;
  externalUrls: {
    musicbrainz?: string;
    spotify?: string;
  };
  // TODO: also add images?
  // images: string[];
};

/**
 * Venue entity.
 */
type Venue = {
  name: string;
  city: string;
  address: string | undefined;
  location:
    | {
        longitude: string;
        latitude: string;
      }
    | undefined;
  // TODO: also add images?
  // images: string[];
};

/**
 * Genre entity.
 */
type Genre = { name: string };

/**
 * ConcertEvent entity.
 */
type ConcertEvent = {
  name: string;
  artists: Artist[];
  genres: Genre[];
  dateTime: {
    doors: string | undefined;
    start: string;
    end: string | undefined;
  };
  venues: Venue[];
  ticketsUrl: string;
  isOnSale: boolean;
};

/**
 * Concert event queue job data type.
 */
export type ConcertEventsQueueDataType = {
  meta: {
    portal: ConcertEventsQueueNameType;
    eventUrl: string;
  };
  event: ConcertEvent;
};
