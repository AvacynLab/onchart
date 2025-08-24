import type { UserType } from '@/app/(auth)/auth';

/**
 * Centralized entitlements mapping listing which features are available for
 * each plan tier. The `'*'` wildcard grants access to all features.
 */
export const ENTITLEMENTS = {
  /** Basic tier for unauthenticated users. */
  free: ['basic-chat', 'basic-charts'] as const,
  /** Paid tier unlocking advanced abilities. */
  pro: [
    'basic-chat',
    'basic-charts',
    'strategy-backtests',
    'export-csv',
  ] as const,
  /** Enterprise plan with unrestricted access. */
  enterprise: ['*'] as const,
} as const;

export type Plan = keyof typeof ENTITLEMENTS;

/**
 * Determine if a given plan grants access to a feature.
 *
 * @param plan - the plan to check
 * @param feature - feature identifier such as `strategy-backtests`
 * @returns true when the feature is allowed
 */
export function hasEntitlement(plan: Plan, feature: string): boolean {
  const list = ENTITLEMENTS[plan];
  return list.includes('*' as never) || list.includes(feature as never);
}

interface ChatEntitlements {
  /** Maximum messages a user may send per day. */
  maxMessagesPerDay: number;
  /** Chat models that the user can select. */
  availableChatModelIds: string[];
}

/**
 * Map application user types to chat-specific entitlements such as message
 * quotas and accessible models. The `pro` tier extends the regular limits.
 */
export const entitlementsByUserType: Record<UserType, ChatEntitlements> = {
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
  pro: {
    maxMessagesPerDay: 1_000,
    availableChatModelIds: [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5o',
      'gpt-oss',
    ],
  },
};
