
// Standalone diagnostic. Run with a Node version that supports --env-file:
//   node --env-file=.env.local test-api-key.js
const { OpenAI } = require('openai');

async function verifyKey() {
  const providers = [
    {
      name: 'MiniMax',
      apiKey: process.env.MINIMAX_API_KEY,
      baseURL: "https://api.minimax.io/v1",
      model: "minimax-m2"
    },
    {
      name: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: undefined,
      model: "gpt-4o"
    },
    {
      name: 'OpenRouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: "nvidia/nemotron-3.5-super-vl:free"
    }
  ];

  const activeProvider = providers.find(p => !!p.apiKey);

  if (!activeProvider) {
    console.error('Error: No API key found in .env.local (MINIMAX_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY)');
    process.exit(1);
  }

  console.log(`\n--- Verifying ${activeProvider.name} API Key ---`);
  
  const openai = new OpenAI({
    apiKey: activeProvider.apiKey,
    baseURL: activeProvider.baseURL
  });

  try {
    console.log(`Testing Chat Completion with ${activeProvider.model}...`);
    const response = await openai.chat.completions.create({
      model: activeProvider.model,
      messages: [{ role: 'user', content: 'Say hello!' }],
    });
    console.log(`\nSuccess! ${activeProvider.name} Key is working.`);
    console.log('AI Response:', response.choices[0].message.content);
  } catch (error) {
    console.error(`\n${activeProvider.name} Verification Failed:`);
    console.error('Error Code:', error.status);
    console.error('Error Message:', error.message);
    process.exit(1);
  }
}

verifyKey();
