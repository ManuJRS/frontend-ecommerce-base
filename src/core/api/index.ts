import axios from 'axios';

// Get API URL from env with fallback
const API_URL = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';

/**
 * Base Axios instance for Strapi communication
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface PaymentIntentItemPayload {
  documentId: string;
  quantity: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  documentId: string;
}

export interface PaymentIntentContactPayload {
  email: string;
  marketingOptIn: boolean;
}

export interface PaymentIntentShippingPayload {
  firstName: string;
  lastName: string;
  address: string;
  country: string;
  phone: string;
  city: string;
  postalCode: string;
  /** Mismo valor que `postalCode` cuando el backend espera el campo `zipCode`. */
  zipCode: string;
  deliveryInstructions: string;
}

/** Cuerpo enviado al crear la orden / PaymentIntent (backend puede persistir contacto y dirección). */
export interface PaymentIntentRequestBody {
  items: PaymentIntentItemPayload[];
  zipCode: string;
  contact: PaymentIntentContactPayload;
  shippingAddress: PaymentIntentShippingPayload;
}

export const fetchPaymentIntent = async (
  body: PaymentIntentRequestBody
): Promise<PaymentIntentResponse> => {
  try {
    const response = await api.post('/orders/payment-intent', body);
    return {
      clientSecret: response.data.clientSecret as string,
      documentId: response.data.documentId as string,
    };
  } catch (error) {
    console.error('Error al iniciar el checkout:', error);
    throw error;
  }
};

export const updateOrderAddress = async (
  documentId: string,
  addressData: any
): Promise<void> => {
  try {
    await api.put(`/orders/${documentId}/address`, {
      data: { shippingAddress: addressData },
    });
  } catch (error) {
    console.error('Error al actualizar la dirección de la orden:', error);
    throw error;
  }
};

// Request interceptor for auth token (if needed in the future)
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('strapi_jwt');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralized error handling
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);
