import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatInterface from '@/components/ai/ChatInterface';

export default function AIDrawer() {
  const { aiDrawerOpen, setAIDrawerOpen } = useUIStore();

  return (
    <>
      {!aiDrawerOpen && (
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setAIDrawerOpen(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-96 bg-white border-l shadow-lg transition-transform duration-300',
          aiDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          <Button variant="ghost" size="icon" onClick={() => setAIDrawerOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="h-[calc(100%-4rem)]">
          <ChatInterface />
        </div>
      </div>
    </>
  );
}
