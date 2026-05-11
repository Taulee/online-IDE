const ROLE_DEFAULT_PERMISSIONS = {
    teacher: {
        canRunCode: true,
        canSaveFiles: true,
        canSubmitCode: false,
        canManageUsers: true,
        canManageAiSettings: true,
        canReviewSubmissions: true,
    },
    student: {
        canRunCode: true,
        canSaveFiles: true,
        canSubmitCode: true,
        canManageUsers: false,
        canManageAiSettings: false,
        canReviewSubmissions: false,
    },
};

function buildPermissions(role, overrides = {}) {
    const basePermissions =
        ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.student;
    return {
        ...basePermissions,
        ...(overrides || {}),
    };
}

module.exports = {
    ROLE_DEFAULT_PERMISSIONS,
    buildPermissions,
};
