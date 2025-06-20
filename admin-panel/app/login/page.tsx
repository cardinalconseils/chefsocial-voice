'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import LoginForm from '@/components/LoginForm';
import { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect if already authenticated
    if (authAPI.isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <>
      <LoginForm />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#27AE60',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#E74C3C',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}