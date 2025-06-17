'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (authAPI.isAuthenticated()) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-chef-light flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spin w-8 h-8 border-4 border-chef-orange border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-chef-gray">Loading...</p>
      </div>
    </div>
  );
}