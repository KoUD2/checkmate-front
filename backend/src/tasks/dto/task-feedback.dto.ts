import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum UserRatingEnum {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export class TaskFeedbackDto {
  @IsEnum(UserRatingEnum)
  rating: 'LIKE' | 'DISLIKE';

  @IsOptional()
  @IsString()
  comment?: string;
}
