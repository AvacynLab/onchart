export const DEFAULT_CHAT_MODEL: string = 'gpt-5';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Base GPT-5 model from OpenAI for general-purpose chat',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Smaller and faster GPT-5 variant with reduced cost',
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    description: 'Lightweight GPT-5 model for quick, low-resource tasks',
  },
  {
    id: 'gpt-5o',
    name: 'GPT-5o',
    description: 'GPT-5 model optimized for conversational applications',
  },
  {
    id: 'gpt-oss',
    name: 'GPT-oss',
    description: 'Cerebras open-source GPT model',
  },
];
