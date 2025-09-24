// Deprecated: FarmerHomePage has been removed.
// Use `ProfilePage` (../profile/ProfilePage) for farmer profile management.

import React from 'react';

export default function FarmerHomePage() {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('FarmerHomePage is deprecated and unused. Use ProfilePage instead.');
  }
  return null;
}