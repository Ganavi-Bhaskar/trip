import { model, Schema, type InferSchemaType } from 'mongoose'

const splitSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  value: { type: Number, required: true, min: 0 },
}, { _id: false })
const shareSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false })

const expenseSchema = new Schema({
  trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 140 },
  amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  currency: { type: String, required: true, uppercase: true },
  exchangeRate: { type: Number, default: 1, min: Number.MIN_VALUE },
  amountInTripCurrency: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  category: { type: String, enum: ['food', 'stay', 'transport', 'activities', 'shopping', 'other'], required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  splitType: { type: String, enum: ['equal', 'custom', 'percentage', 'exact'], required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  customSplits: { type: [splitSchema], default: [] },
  computedShares: { type: [shareSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

expenseSchema.index({ trip: 1, date: -1 })
export type ExpenseFields = InferSchemaType<typeof expenseSchema>
export const Expense = model('Expense', expenseSchema)