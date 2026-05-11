require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const executeRoutes = require("./routes/execute");
const filesRoutes = require("./routes/files");
const usersRoutes = require("./routes/users");
const submissionsRoutes = require("./routes/submissions");
const aiSettingsRoutes = require("./routes/aiSettings");
const { ensureDefaultTeacher } = require("./bootstrap/seedDefaultTeacher");

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// 中间件
app.use(
    cors({
        origin:
            CORS_ORIGIN === "*"
                ? true
                : CORS_ORIGIN.split(",").map((item) => item.trim()),
        credentials: true,
    }),
);
app.use(express.json({ limit: "10mb" }));

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/ai-settings", aiSettingsRoutes);

// 后端 gealth
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://mongodb:27017/online-ide";

mongoose
    .connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to MongoDB");
        await ensureDefaultTeacher();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        // 开发环境下即使 MongoDB 连接失败也启动服务
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (without MongoDB)`);
        });
    });
