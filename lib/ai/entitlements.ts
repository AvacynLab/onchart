import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5o',
      'gpt-oss',
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5o',
      'gpt-oss',
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
