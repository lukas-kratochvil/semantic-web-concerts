/**
 * Converts an array to the union of its values.
 */
export type ArrayToUnion<T extends readonly unknown[]> = T[number];
