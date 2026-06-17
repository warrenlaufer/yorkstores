import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['BUYER', 'STORE_OWNER']),
  company: z.string().min(2).max(100).optional(),
  inviteCode: z.string().max(64).optional(),
  agreedToTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to the policies to sign up' }) }),
}).refine(d => d.role !== 'STORE_OWNER' || !!d.company, {
  message: 'Company name is required for store owners',
  path: ['company'],
}).refine(d => d.role !== 'STORE_OWNER' || !!d.inviteCode?.trim(), {
  message: 'A seller invite code is required',
  path: ['inviteCode'],
})

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
})

export const createDropSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().max(4).default('📦'),
  boxes: z.array(z.object({
    itemName: z.string().min(1).max(100),
    itemPrice: z.number().min(0.01).max(100000),
    itemShippingCost: z.number().min(0).max(1000).default(0),
    itemImageUrl: z.string().url().optional().or(z.literal('')),
    useUscApi: z.boolean().optional().default(false),
    sku: z.string().max(64).optional(),
    qty: z.number().int().min(1).max(200).default(1),
  })).min(1).max(200),
})

export const createOrderSchema = z.object({
  purchaseId: z.string().cuid(),
  recipientName: z.string().min(1).max(100),
  recipientEmail: z.string().email(),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postcode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
})

export const topupSchema = z.object({
  amount: z.number().min(1).max(10000),
})

export const shipOrderSchema = z.object({
  orderId: z.string().cuid(),
  trackingNumber: z.string().min(1).max(200),
  carrier: z.string().max(100).optional(),
})
