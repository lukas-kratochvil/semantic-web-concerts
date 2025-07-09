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

type Artist = {
  name: string;
  country: string | undefined;
  // images: string[];
};

type Genre = { name: string };

type Venue = {
  name: string;
  address: string;
  location:
    | {
        longitude: string;
        latitude: string;
      }
    | undefined;
  // images: string[];
  // url: string;
};

/**
 * Concert event queue job data.
 */
export type ConcertEventJob = {
  meta: {
    portal: keyof typeof ConcertEventsQueue["jobs"];
    eventId: string;
  };
  event: {
    name: string;
    artists: Artist[];
    genres: Genre[];
    dateTime: {
      start: string;
      end: string | undefined;
    };
    venues: Venue[];
    ticketsUrl: string;
    isOnSale: boolean;
  };
};
