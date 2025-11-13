import type { IArtist } from "@semantic-web-concerts/core/interfaces";
import { IsArray, ArrayNotEmpty, ArrayUnique, IsString, IsUrl } from "class-validator";

export class ArtistEntity implements IArtist {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique<string>()
  genres: string[]; // as Text datatype (not URL)

  @IsArray()
  @ArrayNotEmpty()
  @IsUrl(undefined, { each: true })
  @ArrayUnique<string>()
  sameAs: string[];
}
