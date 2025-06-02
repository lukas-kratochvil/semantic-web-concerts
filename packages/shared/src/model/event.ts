export type Event = {
  name: string;
  description: string;
  datetime: Date;
  venueId: string;
  artistId: string[];
  genres: string[];
  ticketsUrl: string;
  isSoldOut: boolean;
};
