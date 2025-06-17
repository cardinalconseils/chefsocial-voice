'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    if (!authAPI.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  if (!authAPI.isAuthenticated()) {
    return (
      <div className="min-h-screen bg-chef-light flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spin w-8 h-8 border-4 border-chef-orange border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-chef-gray">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>

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
    </div>
  );
}