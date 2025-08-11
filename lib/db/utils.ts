import { genSaltSync, hashSync } from 'bcrypt-ts';

/**
 * Generate a bcrypt hash for the provided password. Used exclusively on the
 * server when creating or updating user credentials.
 */
export function generateHashedPassword(password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  return hash;
}
