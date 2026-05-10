# Online IDE

一个基于 Docker 沙箱执行的在线编程平台，支持 Python / C++ / Node.js。项目包含老师/学生角色体系、权限控制、文件隔离、代码提交与审阅。

本仓库当前版本已修复执行服务中的容器日志竞态问题（会导致 `[Exit Code: -1]`），并将前端界面文案全面汉化。

## 1. 功能概览

- 浏览器代码编辑（Monaco Editor）
- 在线运行代码（Docker 隔离执行）
- 标准输入（stdin）支持
- 个人文件保存/加载/删除（按用户隔离）
- JWT 登录鉴权
- 用户角色：老师 / 学生
- 老师管理用户与权限
- 学生提交代码给老师，老师可查看并载入提交内容
- 代码运行报错后，可点击 AI 指导按钮生成教学指导（出错原因、涉及知识点、更正样例）

## 2. 技术栈

- 前端：React 18 + Axios + Monaco Editor + Nginx
- 后端：Node.js + Express + Mongoose + dockerode + JWT
- 数据库：MongoDB 7
- 运行沙箱：独立语言镜像（Python / GCC / Node.js）
- 编排：Docker Compose

## 3. 系统架构

```text
Browser
  │
  ▼
Frontend (Nginx + React, :3000)
  │  /api reverse proxy
  ▼
Backend (Express, :5000)
  ├─ Auth / Users / Files / Submissions / AI Settings
  ├─ Execute Route -> Docker Service
  ├─ AI Guidance Route -> AI Tutor
  └─ MongoDB access
  │
  ├──────────────► MongoDB (:27017)
  │
  └──────────────► Docker Engine (/var/run/docker.sock)
                     └─ create language container
                        └─ run code + collect logs
```

## 4. 目录结构

```text
online-IDE/
├── docker-compose.yml
├── Docker/
│   ├── python/Dockerfile
│   ├── cpp/Dockerfile
│   └── nodejs/Dockerfile
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── server.js
│       ├── services/
│       │   ├── dockerService.js
│       │   └── aiTutorService.js
│       ├── middleware/auth.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── execute.js
│       │   ├── files.js
│       │   ├── users.js
│       │   ├── aiSettings.js
│       │   └── submissions.js
│       ├── models/
│       │   ├── User.js
│       │   ├── File.js
│       │   ├── SystemSetting.js
│       │   └── Submission.js
│       └── bootstrap/seedDefaultTeacher.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.js
        ├── services/api.js
        └── components/
```

## 5. 快速启动

### 5.1 依赖前提

- Docker Engine + Docker Compose
- 需允许挂载 `/var/run/docker.sock`

### 5.2 一键启动

```bash
docker compose up --build -d
```

访问地址：

- 前端：`http://<服务器IP>:3000`
- 后端健康检查：`http://<服务器IP>:5000/api/health`

### 5.3 默认老师账号（首次自动创建）

- 用户名：`teacher`
- 密码：`teacher123`

建议上线后修改默认密码与 `JWT_SECRET`。

## 6. 环境变量

### 6.1 后端（`backend/.env`）

```env
PORT=5000
MONGO_URI=mongodb://mongodb:27017/online-ide
JWT_SECRET=replace-with-a-secure-random-string
DEFAULT_TEACHER_USERNAME=teacher
DEFAULT_TEACHER_PASSWORD=teacher123
CORS_ORIGIN=*
AI_API_BASE_URL=https://api.siliconflow.cn/v1
AI_MODEL=deepseek-ai/DeepSeek-V3
AI_TIMEOUT_MS=60000
AI_CONFIG_SECRET=replace-with-a-secure-random-string
```

说明：

- `CORS_ORIGIN=*` 适合简单部署；生产建议明确域名列表
- `MONGO_URI` 可改为外部 MongoDB
- `AI_API_BASE_URL` 与 `AI_MODEL` 控制 AI 教学指导默认服务地址和模型，界面中可改为其他 OpenAI-compatible 接口
- `AI_TIMEOUT_MS` 控制后端等待 AI 服务响应的最长时间，默认 60000 毫秒
- `AI_CONFIG_SECRET` 用于加密数据库中的系统级 AI API 密钥，生产环境必须替换
- AI API 配置由老师在首页右侧“AI 设置”弹窗中配置，保存后对整个系统生效

### 6.2 前端（`frontend/.env`）

```env
REACT_APP_API_URL=/api
```

- 容器部署建议保持 `/api`（由 Nginx 反代后端）
- 前后端分离开发时可改成 `http://<IP>:5000/api`

## 7. 执行链路与隔离策略（核心）

代码执行入口：`POST /api/execute`

后端执行流程（`backend/src/services/dockerService.js`）：

1. 生成 `executionId`，创建临时目录：`/tmp/online-ide/<executionId>`
2. 写入代码文件与 `stdin.txt`
3. 基于语言选择镜像与命令：
    - Python：`python3 main.py < /code/stdin.txt`
    - C++：`g++ ... && /tmp/output < /code/stdin.txt`
    - Node.js：`node main.js < /code/stdin.txt`
4. 以 `runner` 用户启动容器，挂载 `/code`（只读）
5. 等待结束或超时（30 秒）
6. 读取 stdout/stderr 日志并回传
7. 删除容器与临时目录
8. 若执行失败，前端在输出标题旁显示“AI 指导”按钮
9. 用户点击“AI 指导”后，后端携带代码、stdin、stdout/stderr 和退出码调用 AI

资源限制：

- 执行超时：30s
- 内存限制：128MB
- 网络：`NetworkMode=none`

## 8. 本次关键修复说明（`Exit Code: -1`）

### 8.1 根因

旧逻辑使用 `AutoRemove: true`。容器退出后可能立即被 Docker 删除，后端再调用 `container.logs()` 时会出现竞态失败，最终被统一包装为：

```text
[Error]
Server error please run again
[Exit Code: -1]
```

Python 程序通常退出更快，因此失败概率更高；Node/C++ 因时序差异表现为“偶发失败”。

### 8.2 修复点

- 关闭 `AutoRemove`，改为后端显式 `remove({ force: true })`
- 增加超时强制终止（`kill`）
- 优化错误映射（镜像缺失、容器丢失、超时）
- 日志与容器清理逻辑统一收敛到 `finally`

### 8.3 行为变化

- 超时退出码变为 `124`
- 缺失镜像时会返回明确提示（需 `docker compose build`）
- 不再使用泛化报错 `Server error please run again`

## 9. 权限模型

权限字段位于 `User.permissions`：

- `canRunCode`：运行代码
- `canSaveFiles`：保存/删除文件
- `canSubmitCode`：学生提交代码
- `canManageUsers`：用户管理
- `canReviewSubmissions`：查看学生提交

默认权限：

- `teacher`：运行、保存、提交审阅、用户管理
- `student`：运行、保存、提交（不可管理用户/审阅）

鉴权中间件：`backend/src/middleware/auth.js`

- `authenticateToken`：校验 JWT + 用户激活状态
- `requirePermission(key)`：细粒度权限校验

## 10. 数据模型

### 10.1 User

- `username`（唯一，lowercase）
- `name`
- `passwordHash`（默认不返回）
- `role`（teacher/student）
- `permissions`
- `isActive`

### 10.2 File

- `owner`（用户 ID）
- `name`
- `content`
- `language`（python/cpp/nodejs）
- `timestamps`

### 10.3 Submission

- `student` / `teacher`
- `originalFileName`
- `submittedFileName`（自动 `学生用户名_文件名`）
- `language`
- `content`
- `timestamps`

### 10.4 SystemSetting

- `key`（唯一配置名）
- `value`（配置内容，例如加密后的 AI API 密钥、模型和服务地址）
- `timestamps`

## 11. API 概览

- `POST /api/auth/login`：登录
- `GET /api/auth/me`：当前用户信息
- `POST /api/execute`：运行代码
- `POST /api/execute/guidance`：基于最近一次运行失败上下文按需生成 AI 教学指导
- `GET/POST/PUT/DELETE /api/files`：个人文件
- `GET/POST/PUT/DELETE /api/users`：用户管理（需权限）
- `GET/PUT/DELETE /api/ai-settings`：系统级 AI API 地址、模型和密钥配置（需用户管理权限）
- `GET /api/submissions/teachers`：老师列表
- `POST /api/submissions`：学生提交
- `GET /api/submissions/mine`：我的提交
- `GET /api/submissions/received`：老师查看收到的提交

## 13. 常见问题排查

### 13.1 运行时报镜像不存在

现象：运行返回“运行环境镜像不存在”

处理：

```bash
docker compose build python-compiler cpp-compiler nodejs-runtime backend frontend
docker compose up -d
```

### 13.2 仍然出现执行失败

按顺序检查：

1. `docker ps` 确认 `backend` 正常运行
2. `docker logs <backend容器名>` 查看执行报错
3. 宿主机是否可访问 `/var/run/docker.sock`
4. `/tmp/online-ide` 是否可写

### 13.3 无法登录 / 401

- 检查 `JWT_SECRET` 是否在后端重启后变更
- 清除浏览器本地 token 后重新登录

### 13.4 Mongo 连接失败

- 检查 `MONGO_URI` 指向
- 检查 `mongodb` 容器健康状态

## 14. 本地开发建议

后端开发：

```bash
cd backend
npm install
npm run dev
```

前端开发：

```bash
cd frontend
npm install
npm start
```

开发模式下建议设置：

- 前端 `REACT_APP_API_URL=http://localhost:5000/api`

## 15. 安全与生产建议

- 替换默认老师账号密码
- 使用高强度 `JWT_SECRET`
- 限制 `CORS_ORIGIN` 为可信域名
- 生产环境通过 HTTPS 暴露服务
- 对外部署时建议在外层增加网关限流
