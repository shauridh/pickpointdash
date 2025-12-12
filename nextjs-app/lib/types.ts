export type Role = "ADMIN" | "STAFF";
export type PackageStatus = "ARRIVED" | "PICKED" | "DESTROYED";
export type PackageSize = "S" | "M" | "L";
export type PricingType = "FLAT" | "PROGRESSIVE" | "SIZE" | "QUANTITY";
export type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "CARD";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface PricingSchema {
  type: PricingType;
  gracePeriodDays: number;
  flatRate?: number;
  firstDayRate?: number;
  nextDayRate?: number;
  sizeS?: number;
  sizeM?: number;
  sizeL?: number;
  qtyFirst?: number;
  qtyNextRate?: number;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  pricing: PricingSchema;
  enableDelivery: boolean;
  deliveryFee: number;
  enableMembership: boolean;
  membershipFee: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

export interface Package {
  id: string;
  trackingCode: string;
  locationId: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  status: PackageStatus;
  size: PackageSize;
  weight?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  packageId?: string;
  locationId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  packageId: string;
  type: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
