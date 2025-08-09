import React from "react";

interface EventInvitationPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invitations: any[];
}

export const EventInvitationPanel = ({ isOpen, onOpenChange, invitations }: EventInvitationPanelProps) => {
  // Personal calendar mode - no invitations
  return null;
};