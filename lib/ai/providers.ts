import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cerebras } from '@ai-sdk/cerebras';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'gpt-5': chatModel,
        'gpt-5-mini': chatModel,
        'gpt-5-nano': chatModel,
        'gpt-5o': reasoningModel,
        'gpt-oss': chatModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'gpt-5': openai('gpt-5'),
        'gpt-5-mini': openai('gpt-5-mini'),
        'gpt-5-nano': openai('gpt-5-nano'),
        'gpt-5o': openai('gpt-5o'),
        'gpt-oss': cerebras('gpt-oss'),
        'title-model': openai('gpt-5-mini'),
        'artifact-model': openai('gpt-5-mini'),
      },
      imageModels: {
        'small-model': openai.imageModel('gpt-image-1'),
      },
    });
