import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_type: string | null;
}

interface UserSearchAutocompleteProps {
  onSelect: (user: SearchResult) => void;
  onSendRequest?: (userId: string, displayName: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  showSendButton?: boolean;
  isLoversMode?: boolean;
}

export const UserSearchAutocomplete: React.FC<UserSearchAutocompleteProps> = ({
  onSelect,
  onSendRequest,
  placeholder = "Search by username or name...",
  className,
  showSendButton = true,
  isLoversMode = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      // Use the RPC function for searching
      const { data, error } = await supabase.rpc('search_profiles', {
        _query: searchQuery.trim()
      });

      if (error) throw error;

      // Filter out current user
      const { data: { user } } = await supabase.auth.getUser();
      const filtered = (data || []).filter((r: SearchResult) => r.user_id !== user?.id);
      
      setResults(filtered);
      setIsOpen(filtered.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle user selection
  const handleSelect = (user: SearchResult) => {
    onSelect(user);
    setQuery(user.display_name || user.username || '');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle send friend request
  const handleSendRequest = async (user: SearchResult) => {
    if (!onSendRequest) return;
    
    setSendingTo(user.user_id);
    try {
      await onSendRequest(user.user_id, user.display_name || user.username || 'User');
      setQuery('');
      setResults([]);
      setIsOpen(false);
    } finally {
      setSendingTo(null);
    }
  };

  // Clear input
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 glass border-white/20"
        />
        {loading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {query && !loading && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 glass border border-white/20 rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[280px]">
            {results.map((user, index) => (
              <div
                key={user.user_id}
                className={cn(
                  "flex items-center justify-between p-3 cursor-pointer transition-colors",
                  index === selectedIndex 
                    ? isLoversMode 
                      ? "bg-lovers-primary/20" 
                      : "bg-general-primary/20"
                    : "hover:bg-muted/50"
                )}
                onClick={() => handleSelect(user)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm">
                      {(user.display_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {user.display_name || user.username || 'Unknown'}
                      </p>
                      {user.is_verified && (
                        <span className="text-xs text-blue-500">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username || 'unknown'}
                    </p>
                  </div>
                </div>

                {showSendButton && onSendRequest && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "shrink-0 ml-2",
                      isLoversMode 
                        ? "hover:bg-lovers-primary hover:text-white" 
                        : "hover:bg-general-primary hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendRequest(user);
                    }}
                    disabled={sendingTo === user.user_id}
                  >
                    {sendingTo === user.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 glass border border-white/20 rounded-lg shadow-lg p-4 text-center text-muted-foreground text-sm">
          No users found matching "{query}"
        </div>
      )}
    </div>
  );
};
