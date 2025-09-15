/**
 * Orders Components Index
 * Exports all components related to orders
 */

import { RequestsScreen } from '../requests';
import MyOrdersScreen from './MyOrdersScreen.jsx'; // DEPRECATED: Orders merged into Requests + Chats tabs

export {
  RequestsScreen,  // For Farmer requests
  MyOrdersScreen,  // Deprecated; retained temporarily for backward compatibility
};
