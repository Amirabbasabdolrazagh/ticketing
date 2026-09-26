import { model, models, Schema } from "mongoose";
const userSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      maxlength: 50,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      select: false,
    },
    otp: {
      code: {
        type: String,
      },
      expiresAt: {
        type: Date,
      },
    },
    role: {
      type: String,
      enum: ["admin", "agent", "customer"],
      default: "customer",
    },
    isVerify: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    siteLastSeenAt: {
      type: Date,
      default: null,
      index: true,
    },
    refreshToken: {
      type: String,
    },
    telegramChatId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    telegramUsername: {
      type: String,
      trim: true,
      select: false,
    },
    telegramLinkedAt: {
      type: Date,
      select: false,
    },
    telegramLinkToken: {
      type: String,
      select: false,
    },
    telegramLinkExpiresAt: {
      type: Date,
      select: false,
    },
    baleChatId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    baleUsername: {
      type: String,
      trim: true,
      select: false,
    },
    baleLinkedAt: {
      type: Date,
      select: false,
    },
    baleLinkToken: {
      type: String,
      select: false,
    },
    baleLinkExpiresAt: {
      type: Date,
      select: false,
    },
    preferredMessenger: {
      type: String,
      enum: ["telegram", "bale"],
      select: false,
    },
    passwordResetAttempts: {
      type: Number,
      select: false,
    },
    passwordResetLastSentAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);
const User = models.User || model("User", userSchema);
export default User;
