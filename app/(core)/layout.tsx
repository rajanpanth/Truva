import { ShellATopbar } from '@/components/layout/ShellATopbar';
import { ShellASidebar } from '@/components/layout/ShellASidebar';
import { ShellAStatusBar } from '@/components/layout/ShellAStatusBar';

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShellATopbar />
      <ShellASidebar />
      <main className="ml-0 lg:ml-[220px] mt-[52px] mb-9 min-h-[calc(100vh-52px-36px)] bg-[var(--bg-base)] p-5 lg:p-8">
        {children}
      </main>
      <ShellAStatusBar />
    </>
  );
}
