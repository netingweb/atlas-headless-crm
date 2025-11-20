import { useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { X, MessageSquare, Copy, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatInterface, { type ChatInterfaceHandle } from '@/components/ai/ChatInterface';

export default function AIDrawer() {
  const { aiDrawerOpen, setAIDrawerOpen } = useUIStore();
  const chatRef = useRef<ChatInterfaceHandle | null>(null);

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
          'fixed right-0 top-0 z-50 h-full w-[30rem] sm:w-[34rem] lg:w-[38rem] max-w-full bg-white border-l shadow-lg transition-transform duration-300',
          aiDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4 gap-2">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => chatRef.current?.copyChat()}
              aria-label="Copy chat transcript"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => chatRef.current?.resetChat()}
              aria-label="Reset chat session"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAIDrawerOpen(false)}
              aria-label="Collapse chat drawer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setAIDrawerOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="h-[calc(100%-4rem)]">
          <ChatInterface ref={chatRef} />
        </div>
      </div>
    </>
  );
}
