export interface JwtPayloadTeacher {
    email: string;
    provider?: string | null;
    providerId?: string | null;
    isNew: boolean;
  }