import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/contexts/ChatContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  X, 
  Loader2, 
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

interface SearchResult {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
  conversation_name: string;
}

interface MessageSearchProps {
  onResultClick?: (conversationId: string, messageId: string) => void;
  onClose?: () => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ 
  onResultClick,
  onClose 
}) => {
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.length < 2) return;
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase
        .rpc('search_messages', { 
          search_query: query.trim(),
          result_limit: 50
        });
      
      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result.conversation_id, result.message_id);
  };

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className={`${isLoversMode ? 'bg-lovers-primary/30' : 'bg-general-primary/30'} rounded px-0.5`}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-10 glass border-white/20"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button 
            onClick={handleSearch}
            disabled={loading || query.length < 2}
            className={isLoversMode ? 'bg-lovers-primary hover:bg-lovers-primary/80' : ''}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Search across all your conversations
        </p>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length > 0 ? (
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 mb-2">
              Found {results.length} message{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result) => (
              <button
                key={result.message_id}
                onClick={() => handleResultClick(result)}
                className="w-full p-3 rounded-lg hover:bg-white/10 transition-colors text-left flex items-start gap-3"
              >
                <Avatar className="w-10 h-10 shrink-0">
                  {result.sender_avatar && (
                    <AvatarImage src={result.sender_avatar} />
                  )}
                  <AvatarFallback className={`
                    ${isLoversMode 
                      ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' 
                      : 'bg-gradient-to-br from-general-primary to-general-secondary'
                    } text-white
                  `}>
                    {result.sender_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">
                      {result.sender_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(result.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {highlightMatch(result.content, query)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
              </button>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No messages found</h3>
            <p className="text-sm text-muted-foreground">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">Search your messages</h3>
            <p className="text-sm text-muted-foreground">
              Enter at least 2 characters to search
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
