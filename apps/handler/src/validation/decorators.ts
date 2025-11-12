import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export const IsFutureDate = (validationOptions?: ValidationOptions) => (object: object, propertyName: string) => {
  registerDecorator({
    name: "IsFutureDate",
    target: object.constructor,
    propertyName: propertyName,
    options: validationOptions,
    validator: {
      validate: (value: unknown) => value instanceof Date && value.getTime() > Date.now(),
      defaultMessage: (args: ValidationArguments) => `${args.property} must be a Date in the future.`,
    },
  });
};

export const IsDateMoreInFutureThan
  = (comparedProperty: string, validationOptions?: ValidationOptions) => (object: object, propertyName: string) => {
    registerDecorator({
      name: "IsDateMoreInFutureThan",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [comparedProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [comparedPropertyName] = args.constraints;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comparedValue = (args.object as any)[comparedPropertyName];
          return value instanceof Date && comparedValue instanceof Date && value.getTime() > comparedValue.getTime();
        },
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be a Date more in the future than ${args.constraints.at(0)}.`,
      },
    });
  };
