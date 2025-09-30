/**
 * Student Dashboard (Simplified)
 *
 * Mock dashboard for navigation purposes.
 */

import { useRouter } from 'next/router';

export default function StudentDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Dashboard</h1>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-gray-600 mb-4">
            This is a simplified dashboard for the code review exercise.
          </p>
          <button
            onClick={() => router.push('/student/assignment/1')}
            className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600"
          >
            Start Assignment
          </button>
        </div>
      </div>
    </div>
  );
}
