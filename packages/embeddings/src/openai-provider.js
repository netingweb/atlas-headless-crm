"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    client;
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
        });
    }
    async embedTexts(input, options) {
        const model = options?.model || 'text-embedding-3-small';
        const response = await this.client.embeddings.create({
            model,
            input,
        });
        return response.data.map((item) => item.embedding);
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai-provider.js.map