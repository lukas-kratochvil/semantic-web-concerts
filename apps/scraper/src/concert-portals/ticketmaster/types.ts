/**
 * Types converted from the ticketmaster example response.
 */
export type TicketmasterResponse = TicketmasterData | TicketmasterError;

type TicketmasterError = {
  fault: {
    faultstring: string;
    detail: {
      errorcode: string;
    };
  };
};

type TicketmasterData = {
  _embedded?: Embedded;
  _links: RootLinks;
  page: CurrentPageInfo;
};

export type Embedded = {
  events: Event[];
};

export type Event = {
  name: string;
  type: string;
  id: string;
  test: boolean;
  url: string;
  locale: string;
  images: Image[];
  sales: Sales;
  dates: Dates;
  classifications: Classification[];
  promoter: Promoter;
  promoters: Promoter[];
  seatmap: Seatmap;
  ticketing: Ticketing;
  _links: Links;
  _embedded: EventEmbedded;
};

export type Image = {
  ratio?: string;
  url: string;
  width: number;
  height: number;
  fallback: boolean;
};

export type Sales = {
  public: {
    startDateTime: string;
    startTBD: boolean;
    startTBA: boolean;
    endDateTime: string;
  };
};

export type Dates = {
  access?: AccessDate;
  start: StartDate;
  timezone: string;
  status: {
    code: "onsale" | "offsale" | "cancelled" | "postponed" | "rescheduled";
  };
  spanMultipleDays: boolean;
};

export type AccessDate = {
  startDateTime: string;
  startApproximate: boolean;
  endApproximate: boolean;
};

export type StartDate = {
  localDate: string;
  localTime: string;
  dateTime?: string;
  dateTBD: boolean;
  dateTBA: boolean;
  timeTBA: boolean;
  noSpecificTime: boolean;
};

export type Classification = {
  primary: boolean;
  segment: Segment;
  genre: Genre;
  subGenre: SubGenre;
  family: boolean;
};

export type Segment = {
  id: string;
  name: string;
};

export type Genre = {
  id: string;
  name: string;
};

export type SubGenre = {
  id: string;
  name: string;
};

export type Promoter = {
  id: string;
  name: string;
};

export type Seatmap = {
  staticUrl: string;
  id: string;
};

export type Ticketing = {
  safeTix: {
    enabled: boolean;
  };
  id: string;
};

export type Links = {
  self: {
    href: string;
  };
  attractions: {
    href: string;
  }[];
  venues: {
    href: string;
  }[];
};

export type EventEmbedded = {
  venues: Venue[];
  attractions: Attraction[];
};

export type Venue = {
  name: string;
  type: string;
  id: string;
  test: boolean;
  url: string;
  locale: string;
  images: Image[];
  postalCode: string;
  timezone: string;
  city: {
    name: string;
  };
  country: Country;
  address: {
    line1: string;
  };
  location: Location;
  upcomingEvents: VenueUpcomingEvents;
  _links: {
    self: {
      href: string;
    };
  };
};

export type Country = {
  name: string;
  countryCode: string;
};

export type Location = {
  longitude: string;
  latitude: string;
};

export type VenueUpcomingEvents = {
  "mfx-cz": number;
  _total: number;
  _filtered: number;
};

export type Attraction = {
  name: string;
  type: string;
  id: string;
  test: boolean;
  url: string;
  locale: string;
  externalLinks?: ExternalLinks;
  images: Image[];
  classifications: AttractionClassification[];
  upcomingEvents: AttractionUpcomingEvents;
  _links: {
    self: {
      href: string;
    };
  };
};

export type ExternalLinks = {
  youtube: URL[];
  twitter: URL[];
  itunes: URL[];
  spotify: URL[];
  facebook: URL[];
  instagram: URL[];
  homepage: URL[];
};

export type URL = {
  url: string;
};

export interface AttractionClassification extends Classification {
  type: Type;
  subType: SubType;
}

export type Type = {
  id: string;
  name: string;
};

export type SubType = {
  id: string;
  name: string;
};

export type AttractionUpcomingEvents = {
  "mfx-cz": number;
  _total: number;
  _filtered: number;
  ticketmaster?: number;
  "mfx-de"?: number;
};

export type RootLinks = {
  first: {
    href: string;
  };
  self: {
    href: string;
  };
  next: {
    href: string;
  };
  last: {
    href: string;
  };
};

export type CurrentPageInfo = {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
};
