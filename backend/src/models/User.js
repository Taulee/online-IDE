const mongoose = require('mongoose');
const { buildPermissions } = require('../utils/permissions');

function getPermissionOverrides(user) {
  const permissions = user.permissions?.toObject ? user.permissions.toObject() : (user.permissions || {});
  const overrides = { ...permissions };
  const defaultPaths = user.$__?.activePaths?.states?.default || {};
  const isDefaultAiPermission = (
    (typeof user.$isDefault === 'function' && user.$isDefault('permissions.canManageAiSettings')) ||
    Boolean(defaultPaths['permissions.canManageAiSettings'])
  );

  if (isDefaultAiPermission) {
    delete overrides.canManageAiSettings;
  }

  return overrides;
}

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
  this.permissions = buildPermissions(this.role, getPermissionOverrides(this));
  if (!this.name) {
    this.name = this.username;
  }
  next();
});

userSchema.methods.getEffectivePermissions = function getEffectivePermissions() {
  return buildPermissions(this.role, getPermissionOverrides(this));
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    username: this.username,
    name: this.name,
    role: this.role,
    permissions: this.getEffectivePermissions(),
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);
