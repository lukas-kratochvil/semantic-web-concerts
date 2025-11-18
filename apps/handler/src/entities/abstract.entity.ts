import { IsUUID } from "class-validator";
import { uuidv7 } from "uuidv7";

export abstract class AbstractEntity {
  constructor() {
    this.id = uuidv7();
  }

  @IsUUID(7)
  id: string;
}
