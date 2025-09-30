/**
 * Landing/Login Page
 *
 * Simplified entry point for the homework submission flow.
 * In production, this handles authentication and role-based routing.
 */

import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to assignment page for code review
    router.push('/student/assignment/1');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-4">
          Ottodot LMS
        </h1>
        <p className="text-gray-600">Redirecting to homework assignment...</p>
      </div>
    </div>
  );
}
