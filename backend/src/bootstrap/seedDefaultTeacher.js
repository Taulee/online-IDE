const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function ensureDefaultTeacher() {
    const teacherCount = await User.countDocuments({ role: "teacher" });
    if (teacherCount > 0) {
        return;
    }

    const username = (
        process.env.DEFAULT_TEACHER_USERNAME || "teacher"
    ).toLowerCase();
    const password = process.env.DEFAULT_TEACHER_PASSWORD || "teacher123";

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
        username,
        name: "Default Teacher",
        passwordHash,
        role: "teacher",
        permissions: {
            canRunCode: true,
            canSaveFiles: true,
            canSubmitCode: false,
            canManageUsers: true,
            canManageAiSettings: true,
            canReviewSubmissions: true,
        },
    });

    console.log(
        `Default teacher created. username="${username}" password="${password}"`,
    );
}

module.exports = { ensureDefaultTeacher };
