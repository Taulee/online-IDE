const mongoose = require('mongoose');
const { buildPermissions } = require('../utils/permissions');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      default: ''
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['teacher', 'student'],
      default: 'student'
    },
    permissions: {
      canRunCode: { type: Boolean, default: false },
      canSaveFiles: { type: Boolean, default: false },
      canSubmitCode: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      canManageAiSettings: { type: Boolean, default: false },
      canReviewSubmissions: { type: Boolean, default: false }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('validate', function (next) {
  this.permissions = buildPermissions(this.role, this.permissions);
  if (!this.name) {
    this.name = this.username;
  }
  next();
});

userSchema.methods.toPublicJSON = function toPublicJSON() {
  const currentPermissions = this.permissions?.toObject ? this.permissions.toObject() : this.permissions;
  return {
    _id: this._id,
    username: this.username,
    name: this.name,
    role: this.role,
    permissions: buildPermissions(this.role, currentPermissions),
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);
