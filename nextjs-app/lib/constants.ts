// Roles
export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
} as const;

// Package Status
export const PACKAGE_STATUS = {
  ARRIVED: "ARRIVED",
  PICKED: "PICKED",
  DESTROYED: "DESTROYED",
} as const;

// Package Size
export const PACKAGE_SIZE = {
  S: "S",
  M: "M",
  L: "L",
} as const;

// Pricing Types
export const PRICING_TYPES = {
  FLAT: "FLAT",
  PROGRESSIVE: "PROGRESSIVE",
  SIZE: "SIZE",
  QUANTITY: "QUANTITY",
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: "CASH",
  TRANSFER: "TRANSFER",
  QRIS: "QRIS",
  CARD: "CARD",
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

// Demo Data
export const DEMO_LOCATIONS = [
  {
    id: "loc-1",
    name: "Jakarta Pusat",
    code: "JKT01",
    address: "Jl. Merdeka No. 1, Jakarta Pusat",
    phone: "021-1234567",
  },
  {
    id: "loc-2",
    name: "Jakarta Selatan",
    code: "JKT02",
    address: "Jl. Sudirman No. 100, Jakarta Selatan",
    phone: "021-7654321",
  },
  {
    id: "loc-3",
    name: "Bandung",
    code: "BDG01",
    address: "Jl. Diponegoro No. 50, Bandung",
    phone: "022-5555555",
  },
];

export const DEMO_USERS = [
  {
    id: "user-1",
    email: "admin@pickpoint.com",
    name: "Admin User",
    role: "ADMIN",
  },
  {
    id: "user-2",
    email: "staff@pickpoint.com",
    name: "Staff User",
    role: "STAFF",
  },
];
