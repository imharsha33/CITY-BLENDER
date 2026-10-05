import React from 'react';

export type LoadingStep =
  | 'idle'
  | 'SEARCHING LOCATIONS...'
  | 'LOADING LOCATION'
  | 'LOADING MADURAI DIGITAL TWIN...'
  | 'LOADING ROAD NETWORK'
  | 'LOADING ENVIRONMENT'
  | 'READY'
  | (string & {});

interface LoadingIndicatorProps {
  step: LoadingStep;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ step }) => {
  if (step === 'idle' || step === 'READY') return null;

  return (
    <div className="minimal-loading-pill">
      <span className="search-spinner" />
      <span className="loading-text">{step}</span>
    </div>
  );
};
