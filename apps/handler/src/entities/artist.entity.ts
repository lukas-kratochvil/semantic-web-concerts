import { IsArray, ArrayNotEmpty, ArrayUnique, IsString, IsUrl } from "class-validator";
import type { IArtist } from "../interfaces/artist.interface";

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
