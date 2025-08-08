'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { login, type LoginActionState } from '../actions';
import { SignInPage } from '@/components/ui/sign-in';
import { toast } from '@/components/toast';

export default function Page() {
  const router = useRouter();
  const [state, formAction] = useActionState<LoginActionState, FormData>(login, { status: 'idle' });
  const { update: updateSession } = useSession();

  // Display notifications and refresh session when login state changes
  useEffect(() => {
    if (state.status === 'failed') {
      toast({ type: 'error', description: 'Invalid credentials!' });
    } else if (state.status === 'invalid_data') {
      toast({ type: 'error', description: 'Failed validating your submission!' });
    } else if (state.status === 'success') {
      updateSession();
      router.refresh();
    }
  }, [state.status, router, updateSession]);

  // Handle email/password sign in submission
  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formAction(formData);
  };

  // const handleGoogleSignIn = () => {
  //   // Google sign-in coming soon
  // };

  const handleResetPassword = () => {
    toast({ type: 'info', description: 'Reset password not implemented.' });
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
