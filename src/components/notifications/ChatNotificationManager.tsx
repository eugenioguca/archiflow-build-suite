import React, { useEffect, useState } from 'react';
import { ChatNotificationPopup } from './ChatNotificationPopup';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useNavigate } from 'react-router-dom';

export function ChatNotificationManager() {
  const navigate = useNavigate();
  const { latestNotification, markAsRead } = useChatNotifications();
  const [activePopup, setActivePopup] = useState<any>(null);
  const [popupQueue, setPopupQueue] = useState<any[]>([]);
  const [lastSoundTime, setLastSoundTime] = useState<number>(0);

  useEffect(() => {
    if (latestNotification && !latestNotification.isRead) {
      const now = Date.now();
      
      // Play notification sound with debouncing (minimum 1 second between sounds)
      if (window.playChatNotificationSound && now - lastSoundTime > 1000) {
        window.playChatNotificationSound();
        setLastSoundTime(now);
      }
      
      // Add to queue if there's no active popup, otherwise show immediately
      if (!activePopup) {
        setActivePopup(latestNotification);
      } else {
        setPopupQueue(prev => [...prev, latestNotification]);
      }
    }
  }, [latestNotification, activePopup, lastSoundTime]);

  const handleDismissPopup = () => {
    setActivePopup(null);
    
    // Show next in queue if any
    if (popupQueue.length > 0) {
      const [next, ...rest] = popupQueue;
      setActivePopup(next);
      setPopupQueue(rest);
    }
  };

  const handleNavigateToProject = (projectId: string) => {
    // Mark notification as read
    if (activePopup) {
      markAsRead(activePopup.id);
    }
    
    // Navigate to the appropriate module
    // For now, navigate to sales module with project filter
    navigate(`/sales?project=${projectId}`);
  };

  return (
    <>
      {activePopup && (
        <ChatNotificationPopup
          message={activePopup}
          onDismiss={handleDismissPopup}
          onNavigate={handleNavigateToProject}
        />
      )}
    </>
  );
}