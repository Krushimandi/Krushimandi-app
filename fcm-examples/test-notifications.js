/**
 * Test script for FCM notifications
 * Run this to test different notification types
 */

const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_DEVICE_TOKEN = 'YOUR_DEVICE_TOKEN_HERE'; // Replace with actual device token

// Test functions
async function testPromotionNotification() {
  try {
    console.log('🎉 Testing promotion notification...');
    const response = await axios.post(`${SERVER_URL}/send/promotion`, {
      deviceToken: TEST_DEVICE_TOKEN,
      title: '🍊 Fresh Oranges Sale!',
      body: 'Get 25% off on premium oranges. Limited time offer!',
      offer: {
        text: '25% OFF',
        validity: 'Valid till midnight',
        code: 'ORANGE25'
      },
      actionUrl: 'https://app.krushimandi.com/offers/orange-25off'
    });
    console.log('✅ Promotion notification sent:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testRequestNotification() {
  try {
    console.log('📋 Testing request notification...');
    const response = await axios.post(`${SERVER_URL}/send/request`, {
      deviceToken: TEST_DEVICE_TOKEN,
      requestId: 'req_12345',
      farmerName: 'Ramesh Kumar',
      productName: 'Fresh Bananas',
      status: 'accepted'
    });
    console.log('✅ Request notification sent:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testTransactionNotification() {
  try {
    console.log('💰 Testing transaction notification...');
    const response = await axios.post(`${SERVER_URL}/send/transaction`, {
      deviceToken: TEST_DEVICE_TOKEN,
      amount: '1500',
      currency: 'INR',
      orderId: 'order_67890',
      transactionId: 'txn_abc123',
      status: 'completed'
    });
    console.log('✅ Transaction notification sent:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testAlertNotification() {
  try {
    console.log('⚠️ Testing alert notification...');
    const response = await axios.post(`${SERVER_URL}/send/alert`, {
      deviceToken: TEST_DEVICE_TOKEN,
      alertType: 'weather',
      message: 'Heavy rainfall expected in your area. Please protect your crops and equipment.',
      severity: 'high',
      location: 'Mumbai, Maharashtra'
    });
    console.log('✅ Alert notification sent:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testUpdateNotification() {
  try {
    console.log('🔄 Testing update notification...');
    const response = await axios.post(`${SERVER_URL}/send/update`, {
      deviceToken: TEST_DEVICE_TOKEN,
      version: '1.3.0',
      features: ['Improved user interface', 'Bug fixes', 'New payment options'],
      updateType: 'recommended',
      downloadUrl: 'https://play.google.com/store/apps/details?id=com.krushimandi'
    });
    console.log('✅ Update notification sent:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testTopicNotification() {
  try {
    console.log('📢 Testing topic notification...');
    const response = await axios.post(`${SERVER_URL}/send/topic`, {
      topic: 'farmers_mumbai',
      title: 'Community Workshop',
      body: 'Join our organic farming workshop this Saturday at 10 AM',
      category: 'update',
      screen: 'NotificationScreen',
      extraData: {
        eventDate: '2025-08-10',
        eventTime: '10:00',
        location: 'Mumbai Community Center'
      }
    });
    console.log('✅ Topic notification sent:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting FCM notification tests...\n');
  
  // Check if server is running
  try {
    await axios.get(`${SERVER_URL}/test`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    return;
  }
  
  // Check if device token is set
  if (TEST_DEVICE_TOKEN === 'YOUR_DEVICE_TOKEN_HERE') {
    console.error('❌ Please set a valid device token in TEST_DEVICE_TOKEN');
    return;
  }
  
  await testPromotionNotification();
  console.log('');
  
  await testRequestNotification();
  console.log('');
  
  await testTransactionNotification();
  console.log('');
  
  await testAlertNotification();
  console.log('');
  
  await testUpdateNotification();
  console.log('');
  
  await testTopicNotification();
  
  console.log('\n🎉 All tests completed!');
}

// Run specific test based on command line argument
const testType = process.argv[2];

switch (testType) {
  case 'promotion':
    testPromotionNotification();
    break;
  case 'request':
    testRequestNotification();
    break;
  case 'transaction':
    testTransactionNotification();
    break;
  case 'alert':
    testAlertNotification();
    break;
  case 'update':
    testUpdateNotification();
    break;
  case 'topic':
    testTopicNotification();
    break;
  default:
    runAllTests();
    break;
}

// Export for use in other files
module.exports = {
  testPromotionNotification,
  testRequestNotification,
  testTransactionNotification,
  testAlertNotification,
  testUpdateNotification,
  testTopicNotification
};
