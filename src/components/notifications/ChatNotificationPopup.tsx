import React, { useState, useEffect } from 'react';
import { X, MessageCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface ChatNotificationPopupProps {
  message: {
    id: string;
    content: string;
    senderName: string;
    senderAvatar?: string;
    projectName: string;
    projectId: string;
    timestamp: string;
  };
  onDismiss: () => void;
  onNavigate: (projectId: string) => void;
}

export function ChatNotificationPopup({ message, onDismiss, onNavigate }: ChatNotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
    
    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  const handleNavigate = () => {
    onNavigate(message.projectId);
    handleDismiss();
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible 
        ? 'translate-x-0 opacity-100' 
        : 'translate-x-full opacity-0'
    }`}>
      <Card className="w-80 shadow-lg border-l-4 border-l-primary bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.senderAvatar} />
              <AvatarFallback>
                {message.senderName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground truncate">
                  {message.senderName}
                </p>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {message.projectName}
              </p>
              
              <p className="text-sm text-foreground line-clamp-2 mb-3">
                {message.content}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNavigate}
                    className="h-6 px-2 text-primary hover:text-primary-foreground hover:bg-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}