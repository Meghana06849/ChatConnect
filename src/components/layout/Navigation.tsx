import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Gamepad2, 
  BookOpen, 
  Phone, 
  Users, 
  Settings, 
  LogOut,
  Heart,
  Lock,
  Home
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const navigationItems = {
  general: [
    { icon: Home, label: 'Home', id: 'home' },
    { icon: MessageCircle, label: 'Chats', id: 'chats' },
    { icon: Gamepad2, label: 'Games', id: 'games' },
    { icon: BookOpen, label: 'Stories', id: 'stories' },
    { icon: Phone, label: 'Calls', id: 'calls' },
    { icon: Users, label: 'Friends', id: 'friends' },
  ],
  lovers: [
    { icon: Home, label: 'Home', id: 'home' },
    { icon: Heart, label: 'Chat', id: 'chats' },
    { icon: Gamepad2, label: 'Games', id: 'games' },
    { icon: BookOpen, label: 'Stories', id: 'stories' },
    { icon: Phone, label: 'Calls', id: 'calls' },
    { icon: Lock, label: 'Vault', id: 'vault' },
  ]
};

interface NavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  activeSection, 
  onSectionChange 
}) => {
  const { mode } = useChat();
  const { logout } = useAuth();
  
  const items = navigationItems[mode];
  const isLoversMode = mode === 'lovers';

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "See you soon!"
    });
  };

  return (
    <nav className={`
      w-16 lg:w-64 h-full glass border-r border-white/20 
      flex flex-col transition-all duration-300
      ${isLoversMode ? 'lovers-mode bg-gradient-to-b from-lovers-accent/20 to-lovers-primary/10' : ''}
    `}>
      {/* Logo */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <MessageCircle className={`w-8 h-8 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
            {isLoversMode && (
              <Heart className="w-4 h-4 text-lovers-primary absolute -top-1 -right-1 animate-heart-beat" />
            )}
          </div>
          <div className="hidden lg:block">
            <h1 className={`
              font-bold text-lg bg-gradient-to-r bg-clip-text text-transparent
              ${isLoversMode 
                ? 'from-lovers-primary to-lovers-secondary' 
                : 'from-general-primary to-general-secondary'
              }
            `}>
              ChatConnect
            </h1>
            <p className="text-xs text-muted-foreground">
              {isLoversMode ? 'Lovers Mode 💕' : 'General Mode'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onSectionChange(item.id)}
              className={`
                w-full justify-start p-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? `${isLoversMode 
                      ? 'bg-lovers-primary/20 text-lovers-primary border border-lovers-primary/30' 
                      : 'bg-general-primary/20 text-general-primary border border-general-primary/30'
                    }` 
                  : 'hover:bg-white/10'
                }
              `}
            >
              <Icon className="w-5 h-5 mr-3 lg:mr-3" />
              <span className="hidden lg:inline font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Settings & Logout */}
      <div className="p-2 border-t border-white/20 space-y-1">
        <Button
          variant="ghost"
          onClick={() => onSectionChange('settings')}
          className={`
            w-full justify-start p-3 rounded-xl transition-all duration-200
            ${activeSection === 'settings'
              ? `${isLoversMode 
                  ? 'bg-lovers-primary/20 text-lovers-primary border border-lovers-primary/30' 
                  : 'bg-general-primary/20 text-general-primary border border-general-primary/30'
                }` 
              : 'hover:bg-white/10'
            }
          `}
        >
          <Settings className="w-5 h-5 mr-3 lg:mr-3" />
          <span className="hidden lg:inline font-medium">Settings</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start p-3 rounded-xl hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3 lg:mr-3" />
          <span className="hidden lg:inline font-medium">Logout</span>
        </Button>
      </div>
    </nav>
  );
};