import React from 'react';
import { ClientDocumentHub } from './ClientDocumentHub';

interface ClientDocumentManagerProps {
  clientId: string;
  projectId: string;
}

export const ClientDocumentManager = ({ clientId, projectId }: ClientDocumentManagerProps) => {
  return <ClientDocumentHub clientId={clientId} projectId={projectId} />;
};