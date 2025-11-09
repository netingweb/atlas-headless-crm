"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyAuthGuard = exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("../../core/src");
const jwt_1 = require("./jwt");
let JwtAuthGuard = class JwtAuthGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new core_1.UnauthorizedError('Missing or invalid authorization header');
        }
        const token = authHeader.substring(7);
        try {
            const payload = (0, jwt_1.verifyJwt)(token);
            request.user = payload;
            return true;
        }
        catch (error) {
            throw new core_1.UnauthorizedError(`Invalid token: ${error instanceof Error ? error.message : 'unknown'}`);
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
let ApiKeyAuthGuard = class ApiKeyAuthGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];
        if (!apiKey) {
            throw new core_1.UnauthorizedError('Missing API key');
        }
        if (!apiKey.startsWith('crm_')) {
            throw new core_1.UnauthorizedError('Invalid API key format');
        }
        return true;
    }
};
exports.ApiKeyAuthGuard = ApiKeyAuthGuard;
exports.ApiKeyAuthGuard = ApiKeyAuthGuard = __decorate([
    (0, common_1.Injectable)()
], ApiKeyAuthGuard);
//# sourceMappingURL=guards.js.map