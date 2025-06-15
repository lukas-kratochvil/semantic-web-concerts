export type ConcertEvent = {
  meta: {
    portal: "ticketmaster" | "goout" | "ticketportal";
    eventId: string;
  };
  event: {
    name: string;
    artists: {
      name: string;
      country: string | undefined;
    }[];
    genres: { name: string }[];
    dateTime: {
      start: string;
      end: string | undefined;
    };
    venues: {
      name: string;
      address: string;
      location:
        | {
            longitude: string;
            latitude: string;
          }
        | undefined;
    }[];
    ticketsUrl: string;
    isOnSale: boolean;
  };
};
