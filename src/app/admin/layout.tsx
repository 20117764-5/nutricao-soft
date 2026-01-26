'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminHeader from "@/components/AdminHeader";
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Se não tem sessão, manda para o login do nutricionista
        router.push('/login');
      } else {
        setAuthorized(true);
      }
    };

    checkUser();
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nutri-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-nutri-primary mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nutri-50">
      <AdminHeader />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}