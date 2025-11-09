"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorCache = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
(0, ajv_formats_1.default)(ajv);
class ValidatorCache {
    cache = new Map();
    getOrCompile(tenantId, entityName, entityDef) {
        const key = `${tenantId}:${entityName}`;
        let validator = this.cache.get(key);
        if (!validator) {
            const schema = this.buildJsonSchema(entityDef);
            validator = ajv.compile(schema);
            this.cache.set(key, validator);
        }
        return validator;
    }
    buildJsonSchema(entityDef) {
        const properties = {};
        const required = [];
        for (const field of entityDef.fields) {
            properties[field.name] = this.fieldToJsonSchema(field);
            if (field.required) {
                required.push(field.name);
            }
        }
        return {
            type: 'object',
            properties,
            required,
            additionalProperties: true,
        };
    }
    fieldToJsonSchema(field) {
        const schema = {};
        switch (field.type) {
            case 'string':
            case 'email':
            case 'url':
            case 'text':
                schema.type = 'string';
                if (field.type === 'email') {
                    schema.format = 'email';
                }
                else if (field.type === 'url') {
                    schema.format = 'uri';
                }
                break;
            case 'number':
                schema.type = 'number';
                break;
            case 'boolean':
                schema.type = 'boolean';
                break;
            case 'date':
                schema.type = 'string';
                schema.pattern = '^\\d{4}-\\d{2}-\\d{2}$';
                break;
            case 'json':
                schema.type = 'object';
                break;
            case 'reference':
                schema.type = 'string';
                break;
        }
        if (field.default !== undefined) {
            schema.default = field.default;
        }
        if (field.validation) {
            Object.assign(schema, field.validation);
        }
        return schema;
    }
    clear(tenantId) {
        if (tenantId) {
            const keysToDelete = [];
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${tenantId}:`)) {
                    keysToDelete.push(key);
                }
            }
            for (const key of keysToDelete) {
                this.cache.delete(key);
            }
        }
        else {
            this.cache.clear();
        }
    }
}
exports.ValidatorCache = ValidatorCache;
//# sourceMappingURL=validation.js.map