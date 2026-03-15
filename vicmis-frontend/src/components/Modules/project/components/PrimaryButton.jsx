import React from 'react';

const PrimaryButton = ({ onClick, children, disabled, variant = 'navy' }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`pm-btn pm-btn-${variant}`}
  >
    {children}
  </button>
);

export default PrimaryButton;
