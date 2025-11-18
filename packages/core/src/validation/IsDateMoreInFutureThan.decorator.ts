import { registerDecorator, type ValidationArguments, type ValidationOptions } from "class-validator";

export const IsDateMoreInFutureThan
  = <T extends object>(comparedProperty: keyof T, validationOptions?: ValidationOptions) =>
  (object: object, propertyName: string) => {
    registerDecorator({
      name: "IsDateMoreInFutureThan",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [comparedProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (!(value instanceof Date)) {
            return false;
          }

          const [comparedPropertyName] = args.constraints;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comparedValue = (args.object as any)[comparedPropertyName] as unknown;
          return !(comparedValue instanceof Date) || value.getTime() > comparedValue.getTime();
        },
        defaultMessage: (args: ValidationArguments) =>
          `'${args.property}' must be a Date more in the future than '${args.constraints.at(0)}'.`,
      },
    });
  };
