import { model, Schema, type InferSchemaType } from 'mongoose'

const membershipSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
  role: { type: String, enum: ['organizer', 'member'], default: 'member', required: true },
  preferences: { type: [String], default: [] },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true })

membershipSchema.index({ user: 1, trip: 1 }, { unique: true })
membershipSchema.index({ trip: 1 })
export type MembershipFields = InferSchemaType<typeof membershipSchema>
export const Membership = model('Membership', membershipSchema)