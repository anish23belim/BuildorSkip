import { Rocket } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              Build<span className="text-violet-600">Or</span>Skip
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Explore</Link>
            <Link href="/ideas/new" className="text-sm text-gray-500 hover:text-violet-600 transition-colors">Post Idea</Link>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} BuildOrSkip. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
