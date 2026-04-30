import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum ChatbotMode {
  DISABLED = 'disabled',
  BETA = 'beta',
  ENABLED = 'enabled',
}

export interface IUser extends Document {
  username: string;
  password: string;
  nombre: string;
  role: UserRole;
  chatbotMode: ChatbotMode;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  nombre: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  },
  chatbotMode: {
    type: String,
    enum: Object.values(ChatbotMode),
    default: ChatbotMode.DISABLED,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Index for faster username lookups
UserSchema.index({ username: 1 });

export default mongoose.model<IUser>('User', UserSchema);
