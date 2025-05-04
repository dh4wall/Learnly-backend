export interface JwtPayload {
    email: string;
    provider?: string | null;
    providerId?: string | null; // <--- allow null
    isNew: boolean;
}
