import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export const MAX_WISHLIST = 200;

export class ProductIdsDto {
  @IsArray() @ArrayMaxSize(MAX_WISHLIST) @IsString({ each: true })
  productIds!: string[];
}
