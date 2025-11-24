import path from 'node:path';
import { AgentConfigLoader } from './agent-config-loader';

describe('AgentConfigLoader', () => {
  const configRoot = path.resolve(__dirname, '../../../..', 'config');
  const loader = new AgentConfigLoader(configRoot);

  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalLangchainKey = process.env.LANGCHAIN_API_KEY;
  const originalLangsmithApi = process.env.LANGSMITH_API_URL;
  const originalLangsmithWeb = process.env.LANGSMITH_WEB_URL;

  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.LANGCHAIN_API_KEY = 'test-langsmith-key';
    process.env.LANGSMITH_API_URL = 'http://langsmith.local';
    process.env.LANGSMITH_WEB_URL = 'http://langsmith.local/web';
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    process.env.LANGCHAIN_API_KEY = originalLangchainKey;
    process.env.LANGSMITH_API_URL = originalLangsmithApi;
    process.env.LANGSMITH_WEB_URL = originalLangsmithWeb;
  });

  it('loads agent definitions for a tenant', async () => {
    const definition = await loader.getAgent('demo', 'crm_orchestrator');
    expect(definition).not.toBeNull();
    expect(definition?.llm.model).toBe('gpt-4o-mini');
    expect(definition?.llm.apiKey).toBe('test-openai-key');
    expect(definition?.tracing?.variables.LANGCHAIN_API_KEY).toBe('test-langsmith-key');
    expect(definition?.type).toBe('orchestrator');
  });

  it('returns null for unknown agent', async () => {
    const definition = await loader.getAgent('demo', 'unknown_agent');
    expect(definition).toBeNull();
  });
});

