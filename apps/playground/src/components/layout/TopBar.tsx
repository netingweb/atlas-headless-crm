import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { configApi } from '@/lib/api/config';
import { searchApi } from '@/lib/api/search';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, LogOut, User, Building2, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

export default function TopBar() {
  const navigate = useNavigate();
  const { user, tenantId, unitId, logout } = useAuthStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: units } = useQuery({
    queryKey: ['units', tenantId],
    queryFn: () => configApi.getUnits(tenantId || ''),
    enabled: !!tenantId,
  });

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim() || !tenantId || !unitId) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchApi.global(tenantId, unitId, { q: query, limit: 5 });
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Unable to perform search. Please try again.',
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error message"
            onClick={() => {
              navigator.clipboard
                .writeText('Unable to perform search. Please try again.')
                .then(() => {
                  toast({
                    title: 'Copied',
                    description: 'Error message copied to clipboard',
                  });
                });
            }}
          >
            <Copy className="h-4 w-4" />
          </ToastAction>
        ),
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim()) {
      // Debounce search by 300ms
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
    }
  };

  const handleResultClick = (entity: string, id: string) => {
    navigate(`/entities/${entity}/${id}`);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
  };

  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex-1 max-w-2xl relative" ref={searchContainerRef}>
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            )}
            <Input
              type="text"
              placeholder="Search across all entities..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
              onFocus={() => searchQuery && searchResults.length > 0 && setShowResults(true)}
            />
            {showResults && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No results found</div>
                ) : (
                  searchResults.map((result) => (
                    <div key={`${result.entity}-${result.items.length}`} className="p-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                        {result.entity} ({result.items.length})
                      </div>
                      {result.items.map((item: any) => {
                        const itemId = item._id || item.id || item.document?.id;
                        const displayName =
                          item.name ||
                          item.title ||
                          item.email ||
                          item.document?.name ||
                          item.document?.title ||
                          item.document?.email ||
                          'Untitled';
                        const displayEmail = item.email || item.document?.email;

                        return (
                          <button
                            key={itemId}
                            onClick={() => handleResultClick(result.entity, itemId)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded transition-colors"
                          >
                            <div className="font-medium">{displayName}</div>
                            {displayEmail && (
                              <div className="text-sm text-gray-500">{displayEmail}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{user?.email || 'User'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.email}</span>
                  <span className="text-xs text-gray-500">{tenantId}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {units && units.length > 0 && (
                <>
                  <DropdownMenuLabel>Units</DropdownMenuLabel>
                  {units.map((unit) => (
                    <DropdownMenuItem key={unit.unit_id} disabled={unit.unit_id === unitId}>
                      <Building2 className="h-4 w-4 mr-2" />
                      {unit.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
