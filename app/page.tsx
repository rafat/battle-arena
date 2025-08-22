// app/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Agents Arena
        </h1>
        <p className="text-white/80 text-lg mb-8">
          Battle powerful AI agents
        </p>

        <div className="mb-12 flex justify-center">
          <Image
            src="/image.webp"
            alt="Agents Arena"
            width={600}
            height={400}
            className="rounded-xl shadow-lg"
          />
        </div>

        <div className="flex justify-center gap-8">
          <Link
            href="/agents"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-2xl font-semibold px-8 py-4 rounded-2xl shadow-lg transition"
          >
            Explore Agents
          </Link>
          <Link
            href="/arena"
            className="bg-pink-600 hover:bg-pink-700 text-white text-2xl font-semibold px-8 py-4 rounded-2xl shadow-lg transition"
          >
            Enter Arena
          </Link>
        </div>
      </div>
    </div>
  );
}
