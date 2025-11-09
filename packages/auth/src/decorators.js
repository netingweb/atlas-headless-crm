"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthScopes = exports.SCOPES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SCOPES_KEY = 'scopes';
const AuthScopes = (...scopes) => (0, common_1.SetMetadata)(exports.SCOPES_KEY, scopes);
exports.AuthScopes = AuthScopes;
//# sourceMappingURL=decorators.js.map