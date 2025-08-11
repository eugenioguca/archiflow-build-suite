import React from 'react';

// Stub component for personal calendar - no invitations needed
export interface CalendarNotification {
  id: string;
  event_id: string;
  event_title: string;
  event_start_date: string;
  created_at: string;
}

export const useCalendarNotifications = () => {
  // Personal calendar mode - no invitation notifications
  return {
    notifications: [] as CalendarNotification[],
    hasNewNotifications: false,
    markAsRead: () => {},
    clearNotifications: () => {},
    notificationCount: 0
  };
};