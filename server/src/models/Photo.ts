import { model, Schema, type InferSchemaType } from 'mongoose'

const photoSchema = new Schema({
  trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  caption: { type: String, default: '', maxlength: 300 },
  date: { type: Date, default: Date.now },
  day: { type: Number, min: 1 },
  activity: { type: Schema.Types.ObjectId, ref: 'Activity' },
}, { timestamps: true })

export type PhotoFields = InferSchemaType<typeof photoSchema>
export const Photo = model('Photo', photoSchema)