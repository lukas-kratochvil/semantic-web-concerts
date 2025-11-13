import { Transform } from "class-transformer";
import { IsEnum, IsUrl } from "class-validator";
import { type ITicket, ItemAvailability } from "../interfaces/ticket.interface";

export class TicketEntity implements ITicket {
  @IsUrl()
  url: string;

  @IsEnum(ItemAvailability)
  @Transform(({ value }) => ItemAvailability[value as keyof typeof ItemAvailability])
  availability: ItemAvailability;
}
