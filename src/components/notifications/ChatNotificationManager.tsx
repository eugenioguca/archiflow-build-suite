import React, { useEffect, useState } from 'react';
import { ChatNotificationPopup } from './ChatNotificationPopup';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useNavigate } from 'react-router-dom';

export function ChatNotificationManager() {
  const navigate = useNavigate();
  const { latestNotification, markAsRead } = useChatNotifications();
  const [activePopup, setActivePopup] = useState<any>(null);
  const [popupQueue, setPopupQueue] = useState<any[]>([]);

  useEffect(() => {
    if (latestNotification && !latestNotification.isRead) {
      // Add to queue if there's no active popup, otherwise show immediately
      if (!activePopup) {
        setActivePopup(latestNotification);
      } else {
        setPopupQueue(prev => [...prev, latestNotification]);
      }
    }
  }, [latestNotification, activePopup]);

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