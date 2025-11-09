"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JinaProvider = void 0;
class JinaProvider {
    apiKey;
    baseUrl;
    model;
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('Jina API key is required');
        }
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://api.jina.ai/v1';
        this.model = config.model || 'jina-embeddings-v2-base-en';
    }
    async embedTexts(input, options) {
        const model = options?.model || this.model;
        const url = `${this.baseUrl}/embeddings`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model,
                input,
            }),
        });
        if (!response.ok) {
            throw new Error(`Jina API error: ${response.statusText}`);
        }
        const data = (await response.json());
        return data.data.map((item) => item.embedding);
    }
}
exports.JinaProvider = JinaProvider;
//# sourceMappingURL=jina-provider.js.map