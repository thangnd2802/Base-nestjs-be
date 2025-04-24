import { Transform } from 'class-transformer';
import { IsOptional, Min } from 'class-validator';

export class BaseFilterRequestDto {
  @Transform(({ value }) => {
    try {
      return Number(value);
    } catch {
      return 0;
    }
  })
  @IsOptional()
  @Min(1)
  page?: number;
  @Transform(({ value }) => {
    try {
      return Number(value);
    } catch {
      return 0;
    }
  })
  @IsOptional()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => {
    return new Date(value);
  })
  fromDate?: Date;

  @IsOptional()
  @Transform(({ value }) => {
    return new Date(value);
  })
  toDate?: Date;
}
