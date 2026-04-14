import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** If true, removes overflow-hidden so dropdowns can escape the card */
  noOverflow?: boolean;
}

/** Card — base container: white background, rounded-2xl, shadow-sm, gray border */
export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
} = ({ children, className = '', noOverflow = false }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${noOverflow ? '' : 'overflow-hidden'} ${className}`}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between p-5 border-b border-gray-100 ${className}`}>
    {children}
  </div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
