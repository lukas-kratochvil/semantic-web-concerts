import { registerDecorator, type ValidationArguments, type ValidationOptions } from "class-validator";

export const IsFutureDate = (validationOptions?: ValidationOptions) => (object: object, propertyName: string) => {
  registerDecorator({
    name: "IsFutureDate",
    target: object.constructor,
    propertyName: propertyName,
    options: validationOptions,
    validator: {
      validate: (value: unknown) => value instanceof Date && value.getTime() > Date.now(),
      defaultMessage: (args: ValidationArguments) => `'${args.property}' must be a Date in the future.`,
    },
  });
};
