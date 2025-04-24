export class BaseResponseDto<T = null> {
  public error: boolean;
  public data: T;
  public message?: string;
  constructor(error: boolean, data: T | null, message?: string) {
    this.data = data;
    this.error = error;
    if (message) {
      this.message = message;
    }
  }

  public static internalError(): BaseResponseDto {
    return new BaseResponseDto<null>(true, null, 'Server error');
  }

  public static success<T>(data: T): BaseResponseDto<T> {
    return new BaseResponseDto<T>(false, data);
  }

  public static fail(message: string): BaseResponseDto {
    return new BaseResponseDto(true, null, message);
  }
}

export class PagingResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
