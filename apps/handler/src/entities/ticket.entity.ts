import { ItemAvailability, type ITicket } from "@semantic-web-concerts/core/interfaces";
import { IsIn, IsUrl } from "class-validator";
import { RDFClass, RDFProperty } from "../rdf/decorators";
import { ns } from "../rdf/ontology";
import { AbstractEntity } from "./abstract.entity";

@RDFClass(ns.schema.Offer)
export class TicketEntity extends AbstractEntity implements ITicket {
  @IsUrl()
  @RDFProperty(ns.schema.url, { discriminator: "datatype", datatype: ns.xsd.anyURI })
  url: string;

  // eslint-disable-next-line @darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator
  @IsIn(Object.values(ItemAvailability))
  @RDFProperty<ItemAvailability>(ns.schema.availability, {
    discriminator: "enum",
    map: {
      [ItemAvailability.InStock]: ns.schema.InStock,
      [ItemAvailability.SoldOut]: ns.schema.SoldOut,
    },
  })
  availability: ItemAvailability;
}
