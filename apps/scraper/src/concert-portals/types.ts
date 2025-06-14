export type ConcertEvent = {
  meta: {
    portal: "ticketmaster" | "goout" | "ticketportal";
    eventId: string;
  };
  event: {
    name: string;
    description: string;
    artists: {
      name: string;
      // TODO: add `country`?
      // country: string;
    }[];
    genres: { name: string }[];
    dateTime: string;
    venues: {
      name: string;
      address: string;
      location: {
        longitude: string;
        latitude: string;
      };
    }[];
    ticketsUrl: string;
    isSoldOut: boolean;
  };
};
