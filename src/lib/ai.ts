import OpenAI from "openai";

export interface AIClientConfig {
  client: OpenAI;
  model: string;
}

export const getAIClient = (): AIClientConfig | null => {
  if (process.env.MINIMAX_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.MINIMAX_API_KEY,
        baseURL: "https://api.minimax.io/v1",
      }),
      model: "minimax-m2"
    };
  }
  
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }),
      model: "gpt-4o"
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "HireSense AI",
        }
      }),
      model: "nvidia/nemotron-3.5-super-vl:free"
    };
  }

  return null;
};
