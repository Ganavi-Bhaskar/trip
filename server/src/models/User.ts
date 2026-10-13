import { model, Schema, type InferSchemaType } from 'mongoose'

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, select: false },
  avatar: { type: String, default: '' },
  isGuest: { type: Boolean, default: false },
  preferences: {
    currency: { type: String, default: 'INR' },
    notifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  },
}, { timestamps: true })

export type UserFields = InferSchemaType<typeof userSchema>
export const User = model('User', userSchema)