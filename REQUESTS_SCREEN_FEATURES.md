# RequestsScreen - Buyer Request Management

This screen has been transformed from a WatchlistScreen to a comprehensive **RequestsScreen** that allows buyers to track all their contact information requests sent to farmers.

## 🚀 **Key Features**

### **Request Status Tracking**
- **Pending** - Request sent, waiting for farmer response
- **Accepted** - Farmer approved and shared contact information
- **Rejected** - Farmer declined the request with reason
- **Expired** - Request timed out without response

### **Smart Request Management**
- **Send Requests** - Request farmer contact information for specific products
- **Track Progress** - Monitor status of all sent requests
- **Resend Capability** - Resend expired or rejected requests
- **Bulk Actions** - Select and cancel multiple requests at once

### **Enhanced Request Cards**
- **Product Information** - Fruit/product details with image
- **Farmer Details** - Farmer name and location (contact hidden until approved)
- **Request Details** - Quantity needed, price range, message sent
- **Status Indicators** - Visual status badges and priority markers
- **Response Messages** - Farmer responses for accepted/rejected requests

### **Advanced Filtering & Sorting**
- **Status Filters** - Filter by pending, accepted, rejected, expired
- **Search Functionality** - Search by product, farmer, or location
- **Smart Sorting** - Sort by date, status, priority, or expiry
- **Real-time Updates** - Automatic status updates

### **Contact Information Access**
- **Secure Contact Sharing** - Access farmer contact only when approved
- **Direct Actions** - Call farmer directly from approved requests
- **Message History** - View conversation thread with farmer

### **Request Analytics**
- **Statistics Dashboard** - Total, pending, accepted, rejected counts
- **Success Rate Tracking** - Monitor request approval rates
- **Response Time Insights** - Average farmer response times

### **User Experience Features**
- **Swipe Actions** - Swipe to resend or cancel requests
- **Pull-to-Refresh** - Update request statuses
- **Priority Indicators** - Visual priority markers (High/Medium/Low)
- **Expiry Tracking** - Countdown for pending requests
- **Modern UI** - Clean, intuitive interface with animations

## 📱 **Request Workflow**

1. **Browse Products** → Find farmer's product
2. **Send Request** → Request contact information with message
3. **Track Status** → Monitor in RequestsScreen
4. **Get Response** → Farmer accepts/rejects with message
5. **Access Contact** → Call farmer directly if approved
6. **Resend if Needed** → Resend expired/rejected requests

## 🎯 **Data Structure**

Each request contains:
- Product information (name, image, price, quantity)
- Farmer details (name, location)
- Request metadata (date, status, priority, expiry)
- Messages (buyer request, farmer response)
- Contact information (available when accepted)

## 🔒 **Privacy & Security**

- Farmer contact information is only shared when explicitly approved
- Request messages are stored securely
- Automatic expiry prevents spam requests
- Farmers can reject requests with reasons

This RequestsScreen provides a complete solution for managing buyer-farmer communication while maintaining privacy and providing excellent user experience.
