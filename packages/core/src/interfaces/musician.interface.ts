/**
 * Musician performing in music event.
 */
export interface IMusician {
  /**
   * The name.
   */
  name: string;

  /**
   * Links to other artist's profiles like Spotify or MusicBrainz.
   */
  sameAs: string[];

  /**
   * Names of music genres of artist's work.
   */
  genres: string[];

  /**
   * Musician's country of origin.
   */
  // TODO: include musician's country?
  // country: string | undefined;

  /**
   * Images of the musician.
   */
  // TODO: also add images?
  // images: string[];
}
