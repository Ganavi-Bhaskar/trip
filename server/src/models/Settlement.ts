import { model, Schema, type InferSchemaType } from 'mongoose'

const settlementSchema = new Schema({
  trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  status: { type: String, enum: ['pending', 'settled'], default: 'pending', required: true },
  settledAt: { type: Date },
  settledBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

settlementSchema.index({ trip: 1, status: 1 })
export type SettlementFields = InferSchemaType<typeof settlementSchema>
export const Settlement = model('Settlement', settlementSchema)