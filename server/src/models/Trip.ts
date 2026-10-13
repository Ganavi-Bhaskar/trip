import { model, Schema, type InferSchemaType } from 'mongoose'

const tripSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  destination: { type: String, required: true, trim: true, maxlength: 120 },
  startDate: { type: Date, required: true },
  endDate: {
    type: Date,
    required: true,
    validate: { validator(this: { startDate: Date }, value: Date) { return value >= this.startDate }, message: 'End date must be after start date' },
  },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  coverImage: { type: String, default: '' },
  quote: { type: String, default: 'Good company makes every place beautiful' },
  organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invitationCode: { type: String, uppercase: true, trim: true, minlength: 6, maxlength: 6 },
  invitationActive: { type: Boolean, default: true },
}, { timestamps: true })

tripSchema.index({ name: 'text', destination: 'text' })
tripSchema.index({ invitationCode: 1 }, { unique: true, sparse: true })
export type TripFields = InferSchemaType<typeof tripSchema>
export const Trip = model('Trip', tripSchema)