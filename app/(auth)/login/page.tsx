'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useSafeSession } from '@/lib/auth/useSafeSession';
import { login, type LoginActionState } from '../actions';
import { SignInPage } from '@/components/ui/sign-in';
import { toast } from '@/components/toast';

export default function Page() {
  const router = useRouter();
  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: 'idle' },
  );
  // Use the safe variant to avoid context errors when the provider is missing.
  const { update: updateSession } = useSafeSession();

  // Display notifications and refresh session when login state changes
  useEffect(() => {
    if (state.status === 'failed') {
      toast({ type: 'error', description: 'Invalid credentials!' });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
    } else if (state.status === 'success') {
      updateSession();
      router.refresh();
    }
  }, [state.status, router, updateSession]);

  // Handle email/password sign in submission
  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const formData = new FormData(event.currentTarget);
      await formAction(formData);
    } catch (err) {
      console.debug('login failed', err);
      toast({ type: 'error', description: 'Failed to submit login!' });
    }
  };

  // const handleGoogleSignIn = () => {
  //   // Google sign-in coming soon
  // };

  const handleResetPassword = () => {
    // Notify the user that the action is not yet available using the error
    // style since only "error" and "success" variants are supported.
    toast({ type: 'error', description: 'Reset password not implemented.' });
  };

  const handleCreateAccount = () => {
    router.push('/register');
  };

  return (
    <SignInPage
      onSignIn={handleSignIn}
      // onGoogleSignIn={handleGoogleSignIn}
      onResetPassword={handleResetPassword}
      onCreateAccount={handleCreateAccount}
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
    />
  );
}
