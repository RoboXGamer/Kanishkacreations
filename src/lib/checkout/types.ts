export type CartItemInput = {
  productSlug: string;
  quantity: number;
};

export type LocalCart = {
  items: CartItemInput[];
  updatedAt: string;
};

export type AddressInput = {
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type EnquiryCustomerInput = {
  fullName: string;
  phone: string;
  address: AddressInput;
  notes?: string;
};

export type NormalizedCartItem = {
  productSlug: string;
  productLegacyId: string;
  productTitle: string;
  productImage: string;
  unitPriceInr: number;
  unitPriceFormatted: string;
  quantity: number;
  lineTotalInr: number;
  lineTotalFormatted: string;
  productCategory: string;
  href: string;
};

export type OrderStatus =
  | "submitted"
  | "awaiting_confirmation"
  | "confirmed"
  | "cancel_requested"
  | "cancelled"
  | "completed";

export type RefundStatus =
  | "not_requested"
  | "requested"
  | "pending"
  | "refunded"
  | "rejected";

export type FulfillmentStatus =
  | "unstarted"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered";

export type OrderSummary = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  address: AddressInput;
  notes?: string;
  items: NormalizedCartItem[];
  subtotalInr: number;
  subtotalFormatted: string;
  totalInr: number;
  totalFormatted: string;
  whatsappUrl: string;
  emailUrl: string;
};
