import type { IMusicEvent } from "./interfaces";

/**
 * Music events queue metadata.
 */
export const MusicEventsQueue = {
  name: "music-events",
  jobs: {
    goout: "goout",
    ticketmaster: "ticketmaster",
    ticketportal: "ticketportal",
  },
} as const;

/**
 * Music events queue job name type.
 */
export type MusicEventsQueueNameType = keyof (typeof MusicEventsQueue)["jobs"];

/**
 * Music events queue job data type.
 */
export type MusicEventsQueueDataType = {
  meta: {
    portal: MusicEventsQueueNameType;
  };
  event: IMusicEvent;
};
