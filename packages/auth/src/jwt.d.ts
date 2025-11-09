import type { JwtPayload } from '@crm-atlas/types';
export declare function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string;
export declare function verifyJwt(token: string): JwtPayload;
export declare function decodeJwt(token: string): JwtPayload | null;
//# sourceMappingURL=jwt.d.ts.map
