import type { IArtist } from "@semantic-web-concerts/core/interfaces";
import { IsArray, ArrayUnique, IsString, IsUrl } from "class-validator";
import { AbstractEntity } from "./abstract.entity";

export class ArtistEntity extends AbstractEntity implements IArtist {
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
