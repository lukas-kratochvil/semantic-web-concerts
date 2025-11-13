/**
 * Artist performing in the `IConcert` music event.
 */
export interface IArtist {
  /**
   * The name.
   */
  name: string;

  /**
   * Links to other artist's profiles like Spotify or MusicBrainz.
   */
  sameAs: string[];

  /**
   * Music genres of artist's work.
   */
  genres: string[];

  /**
   * Artist's country of origin.
   */
  // TODO: include artist's country?
  // country: string | undefined;

  /**
   * Images of the artist.
   */
  // TODO: also add images?
  // images: string[];
}
