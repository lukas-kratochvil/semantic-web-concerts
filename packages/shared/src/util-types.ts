/**
 * Converts an array to the union of its values.
 */
export type ArrayToUnion<T extends readonly unknown[]> = T[number];

/**
 * Constructs a type with properties of `T` except for properties in subtype `K` of type `T`.
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
