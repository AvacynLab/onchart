'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useSafeSession } from '@/lib/auth/useSafeSession';
import { register, type RegisterActionState } from '../actions';
import { SignInPage } from '@/components/ui/sign-in';
import { toast } from '@/components/toast';

export default function Page() {
  const router = useRouter();
  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: 'idle' },
  );
  // `useSafeSession` avoids crashes when the SessionProvider is not mounted.
  const { update: updateSession } = useSafeSession();

  // React to registration state changes
  useEffect(() => {
    if (state.status === 'user_exists') {
      toast({ type: 'error', description: 'Account already exists!' });
    } else if (state.status === 'failed') {
      toast({ type: 'error', description: 'Failed to create account!' });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
    } else if (state.status === 'success') {
      toast({ type: 'success', description: 'Account created successfully!' });
      updateSession();
      router.refresh();
    }
  }, [state.status, router, updateSession]);

  // Submit sign up form
  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const formData = new FormData(event.currentTarget);
      await formAction(formData);
    } catch (err) {
      console.debug('registration failed', err);
      toast({ type: 'error', description: 'Failed to submit registration!' });
    }
  };

  // const handleGoogleSignUp = () => {
  //   // Google sign-up coming soon
  // };

  const handleResetPassword = () => {
    // Indicate that password reset is not available using an error variant.
    toast({ type: 'error', description: 'Reset password not implemented.' });
  };

  const handleSignInLink = () => {
    router.push('/login');
  };

  return (
    <SignInPage
      title={
        <span className="font-light text-foreground tracking-tighter">
          Create Account
        </span>
      }
      description="Create an account with your email and password"
      onSignIn={handleSignUp}
      // onGoogleSignIn={handleGoogleSignUp}
      onResetPassword={handleResetPassword}
      onCreateAccount={handleSignInLink}
      footerText="Already have an account?"
      footerLinkText="Sign In"
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
    />
  );
}
