/**
 * Request Service
 * Handles all request-related operations between buyers and farmers
 */

import { auth, firestore } from '../config/firebase';
import { addDoc, collection, increment, serverTimestamp, Timestamp } from '@react-native-firebase/firestore';
import { Request, RequestStatus, CreateRequestInput, RequestResponseInput, RequestFilters, ProductRequestCount } from '../types/Request';

interface CreateFeedbackInput {
    message: string;
    rating?: 'good' | 'neutral' | 'bad';
    userType: 'buyer' | 'farmer';
    timestamp?: number;
    context?: string; // optional - like "app_crash", "feature_request", etc.
}

// Helper type for request creation (before saving to Firestore)
type RequestForCreation = Omit<Request, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'farmerResponse'> & {
    createdAt: any; // Will be serverTimestamp()
    updatedAt: any; // Will be serverTimestamp()
    expiresAt: any; // Will be Timestamp
    farmerResponse?: Omit<Request['farmerResponse'], 'respondedAt'> & {
        respondedAt?: any; // Will be serverTimestamp()
    };
};

class RequestService {
    private db = firestore;

    // Add Feedback to system
    async sendFeedback(uuid: string, input: CreateFeedbackInput): Promise<string> {
        try {
            // Check for existing requests from this buyer for this product
            console.log('🔍 Sending feedback for UUID:', uuid, 'with input:', input);

            const feedbackRef = collection(this.db, 'feedbacks');
            const docRef = await addDoc(feedbackRef, {
                uuid,
                message: input.message,
                rating: input.rating || null,
                userType: input.userType,
                timestamp: Timestamp.now(),
                context: input.context || null,
            });

            return docRef.id; // return generated feedback ID
        } catch (error) {
            console.error('Error sending feedback:', error);
            throw error;
        }

    }

    // Create a new request
    async createRequest(buyerId: string, input: CreateRequestInput): Promise<string> {
        try {
            // Check for existing requests from this buyer for this product
            console.log('🔍 Checking for existing requests from buyer:', buyerId, 'for product:', input.productId);

            const existingRequestsQuery = await this.db
                .collection('requests')
                .where('buyerId', '==', buyerId)
                .where('productId', '==', input.productId)
                .where('status', 'in', ['pending', 'accepted']) // Only check active requests
                .get();

            if (!existingRequestsQuery.empty) {
                const existingRequest = existingRequestsQuery.docs[0].data();
                console.log('❌ Duplicate request found:', {
                    requestId: existingRequestsQuery.docs[0].id,
                    status: existingRequest.status,
                    createdAt: existingRequest.createdAt
                });

                throw new Error('You have already sent a request for this product. Please wait for the farmer to respond.');
            }

            console.log('✅ No existing requests found, proceeding with creation...');

            // First get the fruit details from fruits collection
            const fruitDoc = await this.db.collection('fruits').doc(input.productId).get();
            if (!fruitDoc.exists) {
                throw new Error('Fruit not found');
            }

            const fruitData = fruitDoc.data();
            console.log('🍎 Fruit data from Firestore:', JSON.stringify(fruitData, null, 2));
            console.log('🍎 Fruit data keys:', Object.keys(fruitData || {}));

            // Get buyer details
            const buyerDoc = await this.db.collection('buyers').doc(buyerId).get();
            if (!buyerDoc.exists) {
                throw new Error('Buyer not found');
            }

            const buyerData = buyerDoc.data();
            console.log('👤 Buyer data from Firestore:', JSON.stringify(buyerData, null, 2));
            console.log('👤 Buyer data keys:', Object.keys(buyerData || {}));

            // Get farmer details
            const farmerDoc = await this.db.collection('farmers').doc(fruitData!.farmer_id).get();
            if (!farmerDoc.exists) {
                throw new Error('Farmer not found');
            }

            const farmerData = farmerDoc.data();
            console.log('🚜 Farmer data from Firestore:', JSON.stringify(farmerData, null, 2));
            console.log('🚜 Farmer data keys:', Object.keys(farmerData || {}));

            // Normalize buyer location (can be object or string)
            const rawBuyerLocation: any = buyerData!.location;
            const buyerLocationStr = typeof rawBuyerLocation === 'string'
                ? rawBuyerLocation
                : (rawBuyerLocation && typeof rawBuyerLocation === 'object'
                    ? [rawBuyerLocation.village, rawBuyerLocation.city, rawBuyerLocation.district, rawBuyerLocation.state]
                        .filter(Boolean)
                        .join(', ') || 'Unknown Location'
                    : 'Unknown Location');

            // Normalize farmer location
            const rawFarmerLocation: any = farmerData!.location || fruitData!.location;
            const farmerLocationStr = typeof rawFarmerLocation === 'string'
                ? rawFarmerLocation
                : (rawFarmerLocation && typeof rawFarmerLocation === 'object'
                    ? [rawFarmerLocation.village, rawFarmerLocation.city, rawFarmerLocation.district, rawFarmerLocation.state]
                        .filter(Boolean)
                        .join(', ') || 'Unknown Location'
                    : 'Unknown Location');

            // Create request object
            const request: RequestForCreation = {
                buyerId,
                farmerId: fruitData!.farmer_id,
                productId: input.productId,
                quantity: input.quantity,
                quantityUnit: input.quantityUnit || 'ton',
                message: input.message || '',
                status: RequestStatus.PENDING,
                createdAt: Timestamp.fromDate(new Date(Date.now())),
                updatedAt: Timestamp.fromDate(new Date(Date.now())),
                expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
                productSnapshot: {
                    name: fruitData!.name || 'Unknown Fruit',
                    price: fruitData!.price_per_kg || 0,
                    priceUnit: 'ton', // Default unit as per new schema
                    category: fruitData!.type || 'Other',
                    farmerName: farmerData!.name || farmerData!.displayName || 'Unknown Farmer',
                    farmerLocation: farmerLocationStr,
                    imageUrl: fruitData!.image_urls && fruitData!.image_urls.length > 0 ? fruitData!.image_urls[0] : ''
                },
                buyerDetails: {
                    name: buyerData!.name || buyerData!.displayName || 'Unknown Buyer',
                    phone: buyerData!.phone || buyerData!.phoneNumber || '',
                    location: buyerLocationStr
                }
            };

            // Validate request object - remove any undefined fields
            const cleanedRequest = this.cleanObjectForFirestore(request);
            console.log('📝 Cleaned request object:', {
                ...cleanedRequest,
                // Convert timestamps to readable format for logging
                createdAt: cleanedRequest.createdAt?.toString() || 'serverTimestamp()',
                updatedAt: cleanedRequest.updatedAt?.toString() || 'serverTimestamp()',
                expiresAt: cleanedRequest.expiresAt?.toDate?.() || cleanedRequest.expiresAt
            });
            console.log('📝 Request timestamps:', {
                createdAt: cleanedRequest.createdAt,
                updatedAt: cleanedRequest.updatedAt,
                expiresAt: cleanedRequest.expiresAt,
                createdAtType: typeof cleanedRequest.createdAt,
                expiresAtType: typeof cleanedRequest.expiresAt
            });

            // Add request to database
            const docRef = await this.db.collection('requests').add(cleanedRequest);
            console.log('✅ Request created with ID:', docRef.id);

            // Update fruit request count
            await this.updateProductRequestCount(input.productId, 1);

            return docRef.id;
        } catch (error) {
            console.error('Error creating request:', error);
            throw error;
        }
    }



    // Get requests for a buyer
    async getBuyerRequests(buyerId: string, filters?: RequestFilters): Promise<Request[]> {
        try {
            let query = this.db.collection('requests')
                .where('buyerId', '==', buyerId)
                .orderBy('createdAt', 'desc');

            if (filters?.status && filters.status !== 'all') {
                query = query.where('status', '==', filters.status);
            }

            const querySnapshot = await query.get();
            const requests = querySnapshot.docs.map(doc => {
                const data = doc.data();
                console.log('📋 Buyer request data from Firestore:', {
                    id: doc.id,
                    productSnapshot: data.productSnapshot,
                    buyerDetails: data.buyerDetails,
                    quantity: data.quantity,
                    quantityUnit: data.quantityUnit,
                    status: data.status,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    createdAtType: typeof data.createdAt,
                    hasToDate: data.createdAt && typeof data.createdAt.toDate === 'function',
                    createdAtString: data.createdAt?.toDate?.()?.toISOString() || 'No date'
                });
                return {
                    id: doc.id,
                    ...data
                } as Request;
            });

            return requests;
        } catch (error) {
            console.error('Error fetching buyer requests:', error);
            throw error;
        }
    }

    // Get requests for a farmer
    async getFarmerRequests(farmerId: string, filters?: RequestFilters): Promise<Request[]> {
        try {
            let query = this.db.collection('requests')
                .where('farmerId', '==', farmerId)
                .orderBy('createdAt', 'desc');

            if (filters?.status && filters.status !== 'all') {
                query = query.where('status', '==', filters.status);
            }

            const querySnapshot = await query.get();
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Request));
        } catch (error) {
            console.error('Error fetching farmer requests:', error);
            throw error;
        }
    }

    // Respond to a request (farmer action)
    async respondToRequest(farmerId: string, input: RequestResponseInput): Promise<void> {
        try {
            console.log('🚜 Farmer responding to request:', {
                farmerId,
                requestId: input.requestId,
                status: input.status,
                input
            });

            const requestDoc = await this.db.collection('requests').doc(input.requestId).get();

            if (!requestDoc.exists) {
                console.error('❌ Request not found:', input.requestId);
                throw new Error('Request not found');
            }

            const requestData = requestDoc.data();
            console.log('📄 Current request data:', {
                farmerId: requestData!.farmerId,
                status: requestData!.status,
                buyerId: requestData!.buyerId
            });

            // Verify farmer owns this request
            if (requestData!.farmerId !== farmerId) {
                console.error('❌ Unauthorized farmer:', {
                    requestFarmerId: requestData!.farmerId,
                    actualFarmerId: farmerId
                });
                throw new Error('Unauthorized: You can only respond to your own requests');
            }

            console.log('✅ Farmer authorization verified, updating request...');

            // Build farmerResponse object with only defined fields
            const farmerResponse: any = {
                respondedAt: serverTimestamp(),
            };

            // Only include fields that are defined
            if (input.message !== undefined) {
                farmerResponse.message = input.message;
            }
            if (input.proposedPrice !== undefined) {
                farmerResponse.proposedPrice = input.proposedPrice;
            }
            if (input.proposedQuantity !== undefined) {
                farmerResponse.proposedQuantity = input.proposedQuantity;
            }
            if (input.availableFrom !== undefined) {
                farmerResponse.availableFrom = input.availableFrom;
            }

            // Update request with response
            await this.db.collection('requests').doc(input.requestId).update({
                status: input.status,
                updatedAt: serverTimestamp(),
                farmerResponse: farmerResponse
            });

            console.log('✅ Request updated successfully:', {
                requestId: input.requestId,
                newStatus: input.status
            });
        } catch (error) {
            console.error('❌ Error responding to request:', error);
            throw error;
        }
    }

    // Cancel/Delete request (buyer action)
    async cancelRequest(buyerId: string, requestId: string): Promise<void> {
        try {
            const requestDoc = await this.db.collection('requests').doc(requestId).get();

            if (!requestDoc.exists) {
                throw new Error('Request not found');
            }

            const requestData = requestDoc.data();

            // Verify buyer owns this request
            if (requestData!.buyerId !== buyerId) {
                throw new Error('Unauthorized: You can only cancel your own requests');
            }

            // Update request status to cancelled
            await this.db.collection('requests').doc(requestId).update({
                status: RequestStatus.CANCELLED,
                updatedAt: serverTimestamp()
            });

            // Decrease fruit request count
            await this.updateProductRequestCount(requestData!.productId, -1);
        } catch (error) {
            console.error('Error cancelling request:', error);
            throw error;
        }
    }

    // Resend request (buyer action)
    async resendRequest(buyerId: string, requestId: string): Promise<string> {
        try {
            const requestDoc = await this.db.collection('requests').doc(requestId).get();

            if (!requestDoc.exists) {
                throw new Error('Request not found');
            }

            const requestData = requestDoc.data() as Request;

            // Verify buyer owns this request
            if (requestData.buyerId !== buyerId) {
                throw new Error('Unauthorized: You can only resend your own requests');
            }

            // Update existing request to pending status with new timestamps
            await this.db.collection('requests').doc(requestId).update({
                status: RequestStatus.PENDING,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(), // Reset creation time for resent requests
                expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // New expiry date
                // Clear any farmer response data since it's being resent
                farmerResponse: null
            });

            console.log('✅ Request resent with ID:', requestId);

            // Update fruit request count (only if it was cancelled/rejected before)
            if (requestData.status === RequestStatus.CANCELLED ||
                requestData.status === RequestStatus.REJECTED ||
                requestData.status === RequestStatus.EXPIRED) {
                await this.updateProductRequestCount(requestData.productId, 1);
            }

            return requestId;
        } catch (error) {
            console.error('Error resending request:', error);
            throw error;
        }
    }

    // Get request counts for fruits
    async getProductRequestCounts(productIds: string[]): Promise<ProductRequestCount[]> {
        try {
            const counts: ProductRequestCount[] = [];

            for (const productId of productIds) {
                const querySnapshot = await this.db.collection('requests')
                    .where('productId', '==', productId)
                    .where('status', '==', RequestStatus.PENDING)
                    .get();

                if (querySnapshot.docs.length > 0) {
                    const lastRequest = querySnapshot.docs[0].data();
                    counts.push({
                        productId,
                        count: querySnapshot.docs.length,
                        lastRequestAt: lastRequest.createdAt
                    });
                }
            }

            return counts;
        } catch (error) {
            console.error('Error fetching fruit request counts:', error);
            throw error;
        }
    }

    // Update fruit request count in fruits collection
    private async updateProductRequestCount(productId: string, delta: number): Promise<void> {
        try {
            const fruitRef = this.db.collection('fruits').doc(productId);
            await fruitRef.update({
                requestCount: increment(delta),
                lastRequestAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating fruit request count:', error);
            // Don't throw here as this is not critical for the main flow
        }
    }

    // Get single request by ID
    async getRequest(requestId: string): Promise<Request | null> {
        try {
            const requestDoc = await this.db.collection('requests').doc(requestId).get();
            if (!requestDoc.exists) {
                return null;
            }

            return {
                id: requestDoc.id,
                ...requestDoc.data()
            } as Request;
        } catch (error) {
            console.error('Error fetching request:', error);
            throw error;
        }
    }

    // Clean up expired requests (utility function)
    async cleanupExpiredRequests(): Promise<void> {
        try {
            const now = Timestamp.now();
            const querySnapshot = await this.db.collection('requests')
                .where('expiresAt', '<', now)
                .where('status', '==', RequestStatus.PENDING)
                .get();

            const batch = this.db.batch();

            querySnapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    status: RequestStatus.EXPIRED,
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
        } catch (error) {
            console.error('Error cleaning up expired requests:', error);
            throw error;
        }
    }

    // Helper method to clean object for Firestore (remove undefined values)
    private cleanObjectForFirestore(obj: any): any {
        const cleaned: any = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (value !== undefined) {
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        // Recursively clean nested objects
                        cleaned[key] = this.cleanObjectForFirestore(value);
                    } else {
                        cleaned[key] = value;
                    }
                }
            }
        }

        return cleaned;
    }

    // Check if buyer has already sent a request for a specific product
    async hasExistingRequest(buyerId: string, productId: string): Promise<boolean> {
        try {
            const existingRequestsQuery = await this.db
                .collection('requests')
                .where('buyerId', '==', buyerId)
                .where('productId', '==', productId)
                .where('status', 'in', ['pending', 'accepted'])
                .limit(1)
                .get();

            return !existingRequestsQuery.empty;
        } catch (error) {
            console.error('Error checking existing requests:', error);
            throw error;
        }
    }
}

export const requestService = new RequestService();
