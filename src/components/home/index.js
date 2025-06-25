/**
 * Home Components Index
 * Exports all components related to home screens
 */

import HomeScreen from './HomeScreen.jsx';
import BuyerHomeScreen from './BuyerHomeScreen.jsx';
import FarmerHomeScreen from './FarmerHomeScreen.jsx';
import WatchlistScreen from './WatchlistScreen.jsx';

// Default exports
export default HomeScreen;

// Named exports
export {
  HomeScreen,        // Original HomeScreen (for backward compatibility)
  BuyerHomeScreen,   // Specialized home screen for buyers
  FarmerHomeScreen,  // Specialized home screen for farmers
  WatchlistScreen,   // Watchlist screen for buyers
};
