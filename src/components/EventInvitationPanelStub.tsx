import React from 'react';

interface EventInvitationPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invitations: any[];
}

// Stub component to replace invitation functionality
export const EventInvitationPanel: React.FC<EventInvitationPanelProps> = () => {
  return null; // Event invitations disabled for personal calendar
};