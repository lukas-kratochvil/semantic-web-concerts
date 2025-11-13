import { ItemAvailability, type ITicket } from "@semantic-web-concerts/core/interfaces";
import { Transform } from "class-transformer";
import { IsEnum, IsUrl } from "class-validator";

export class TicketEntity implements ITicket {
  @IsUrl()
  url: string;

  @IsEnum(ItemAvailability)
  @Transform(({ value }) => ItemAvailability[value as keyof typeof ItemAvailability])
  availability: ItemAvailability;
}
