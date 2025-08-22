// components/NavBar.tsx
'use client';

import Link from 'next/link';
import ConnectWallet from './ConnectWallet';

export default function NavBar() {
  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between bg-gray-900 shadow-md">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-white text-xl font-bold">
          Agents Arena
        </Link>
        <Link href="/agents" className="text-white hover:text-indigo-400 transition">
          Agents
        </Link>
        <Link href="/arena" className="text-white hover:text-indigo-400 transition">
          Arena
        </Link>
        <Link href="/leaderboard" className="text-white hover:text-indigo-400 transition">
          Leaderboard
        </Link>
      </div>
      <ConnectWallet />
    </nav>
  );
}

