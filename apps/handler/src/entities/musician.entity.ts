import type { IMusician } from "@semantic-web-concerts/core/interfaces";
import { IsArray, ArrayUnique, IsString, IsUrl } from "class-validator";

export class MusicianEntity implements IMusician {
  @IsString()
  name: string;

  @IsArray()
  @ArrayUnique<string>()
  genres: string[];

  @IsArray()
  @IsUrl(undefined, { each: true })
  @ArrayUnique<string>()
  sameAs: string[];
}
