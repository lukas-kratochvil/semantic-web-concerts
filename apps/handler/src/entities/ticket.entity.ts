import { ItemAvailability, type ITicket } from "@semantic-web-concerts/core/interfaces";
import { IsIn, IsUrl } from "class-validator";
import { AbstractEntity } from "./abstract.entity";

export class TicketEntity extends AbstractEntity implements ITicket {
  @IsUrl()
  url: string;

  // eslint-disable-next-line @darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator
  @IsIn(Object.values(ItemAvailability))
  availability: ItemAvailability;
}
