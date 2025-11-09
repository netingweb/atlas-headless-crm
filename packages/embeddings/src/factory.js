"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmbeddingsProvider = createEmbeddingsProvider;
exports.getProviderConfig = getProviderConfig;
const openai_provider_1 = require("./openai-provider");
const jina_provider_1 = require("./jina-provider");
function createEmbeddingsProvider(globalCfg, tenantOverride) {
    const cfg = tenantOverride?.name
        ? { ...globalCfg, ...tenantOverride }
        : globalCfg;
    switch (cfg.name) {
        case 'openai':
            return new openai_provider_1.OpenAIProvider(cfg);
        case 'jina':
            return new jina_provider_1.JinaProvider(cfg);
        case 'local':
            throw new Error('Local provider not yet implemented');
        default:
            throw new Error(`Unsupported provider: ${cfg.name}`);
    }
}
function getProviderConfig() {
    const providerName = (process.env.EMBEDDINGS_PROVIDER || 'openai');
    const config = {
        name: providerName,
    };
    switch (providerName) {
        case 'openai':
            config.apiKey = process.env.OPENAI_API_KEY;
            config.model = process.env.OPENAI_MODEL || 'text-embedding-3-small';
            break;
        case 'jina':
            config.apiKey = process.env.JINA_API_KEY;
            config.model = process.env.JINA_MODEL || 'jina-embeddings-v2-base-en';
            config.baseUrl = process.env.JINA_BASE_URL || 'https://api.jina.ai/v1';
            break;
    }
    return config;
}
//# sourceMappingURL=factory.js.map