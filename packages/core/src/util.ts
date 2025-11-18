import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import type { AbstractEntity } from "./entities";

/**
 * Converts plain (literal) object to entity.
 */
export const plainToEntity = <T extends AbstractEntity>(cls: new () => T, plain: object): T => plainToClass(cls, plain);

/**
 * Validates given entity.
 */
export const validateEntity = <T extends AbstractEntity>(entity: T) => validate(entity);
