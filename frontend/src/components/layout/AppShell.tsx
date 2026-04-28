import { useState } from 'react';
import Sidebar, { type PageId } from './Sidebar';
import Header from './Header';

interface Props {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  children: React.ReactNode;
}

export default function AppShell({ activePage, onNavigate, searchQuery, onSearchChange, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-surface-page)]">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — pushed right on desktop, full-width on mobile */}
      <div className="flex min-w-0 flex-1 flex-col sidebar-offset">
        <Header
          activePage={activePage}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onNavigate={onNavigate}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
