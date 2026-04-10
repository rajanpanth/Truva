import { ShellATopbar } from '@/components/layout/ShellATopbar';
import { ShellASidebar } from '@/components/layout/ShellASidebar';
import { ShellAStatusBar } from '@/components/layout/ShellAStatusBar';

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShellATopbar />
      <ShellASidebar />
      <main className="ml-[210px] mt-12 mb-9 min-h-[calc(100vh-48px-36px)] bg-[var(--bg-base)] p-8">
        {children}
      </main>
      <ShellAStatusBar />
    </>
  );
}
