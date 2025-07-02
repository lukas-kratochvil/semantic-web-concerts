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

export type ConcertEvent = {
  meta: {
    portal: "ticketmaster" | "goout" | "ticketportal";
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
