import { model, Schema, type InferSchemaType } from 'mongoose'

const activitySchema = new Schema({
  trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  day: { type: Number, required: true, min: 1 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  location: { type: String, default: '', maxlength: 160 },
  category: { type: String, enum: ['transport', 'food', 'stay', 'activity', 'sightseeing', 'shopping', 'other'], default: 'activity' },
  icon: { type: String, default: '' },
  image: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

activitySchema.index({ trip: 1, day: 1, time: 1 })
export type ActivityFields = InferSchemaType<typeof activitySchema>
export const Activity = model('Activity', activitySchema)