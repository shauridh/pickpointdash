import { z } from "zod"

export const phoneSchema = z
  .string()
  .regex(
    /^(\+62|0)[0-9]{9,12}$/,
    "Phone harus format +62... atau 0..."
  )

export const createPackageSchema = z.object({
  trackingNumber: z.string().min(3).max(50),
  courierName: z.string().min(2).max(50),
  recipientPhone: phoneSchema,
  recipientName: z.string().min(2).max(100),
  locationId: z.string().cuid(),
  isDeliveryReq: z.boolean().optional().default(false),
  deliveryNote: z.string().max(500).optional(),
})

export const checkoutSchema = z.object({
  packageId: z.string().cuid(),
  paymentMethod: z.enum(["CASH", "QRIS", "VA", "SUBSCRIPTION"]),
})

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: phoneSchema,
  password: z.string().min(8).max(50),
  role: z.enum(["RESIDENT", "STAFF"]).optional().default("RESIDENT"),
})

export const userRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: phoneSchema,
  password: z.string().min(8).max(50),
  role: z.string().optional().default("RESIDENT"),
})

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string(),
})

export const updateLocationPricingSchema = z.object({
  gracePeriodDays: z.number().min(0).max(30),
  priceDayOne: z.number().min(0),
  priceNextDay: z.number().min(0),
  priceFirstPackage: z.number().min(0),
  priceNextPackage: z.number().min(0),
  deliveryFee: z.number().min(0),
})

export type CreatePackageInput = z.infer<typeof createPackageSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UserRegisterInput = z.infer<typeof userRegisterSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateLocationPricingInput = z.infer<
  typeof updateLocationPricingSchema
>
