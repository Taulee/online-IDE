# Online IDE (多用户版)

支持在浏览器中编写并运行 Python / C++ / Node.js 代码，后端在服务器执行并返回结果。  
已新增老师/学生多用户体系、权限管理、学生存储隔离、学生向老师提交代码等能力。

## 功能总览

- 浏览器代码编辑（Monaco Editor）
- 代码运行（Docker 隔离执行）
- 文件保存与加载（MongoDB）
- 用户登录（JWT）
- 角色体系：老师 / 学生
- 老师管理用户：添加、删除、修改权限、启停账号
- 学生文件隔离：学生只能看到自己的文件
- 学生提交代码给老师：提交文件自动加前缀 `学生用户名_文件名`
- 局域网 / 公网访问：通过 `服务器IP:端口` 使用

## 系统架构

```text
浏览器(任意联网电脑)
   │  HTTP
   ▼
前端 Nginx + React (3000)
   │  /api 反向代理
   ▼
后端 Express (5000)
   ├─ JWT 鉴权 + 权限控制
   ├─ 文件/提交/用户管理
   ├─ 代码执行调度
   ▼
MongoDB (27017)
   ▲
后端通过 Docker Engine 启动语言沙箱容器执行代码
```

## 角色与权限

用户字段包含 `role` 与 `permissions`。

- 老师默认权限：
  - `canManageUsers=true`
  - `canReviewSubmissions=true`
  - `canRunCode=true`
  - `canSaveFiles=true`
- 学生默认权限：
  - `canSubmitCode=true`
  - `canRunCode=true`
  - `canSaveFiles=true`

老师可在前端「用户管理」中修改任意用户权限。

## 关键业务规则

1. 文件隔离：
   - 文件保存时绑定 `owner=userId`
   - 查询/读取/更新/删除文件时仅允许访问自己的文件
2. 学生提交：
   - 学生选择老师并提交代码
   - 后端生成提交文件名：`学生用户名_原文件名`
3. 用户管理：
   - 仅具备 `canManageUsers` 的账号可进行添加/删除/更新用户

## 快速启动（Docker Compose）

```bash
docker compose up --build
```

启动后访问：

- 前端：`http://<服务器IP>:3000`
- 后端健康检查：`http://<服务器IP>:5000/api/health`

> 若服务器有公网 IP，放通安全组/防火墙端口 `3000`（前端）和可选 `5000`（调试 API）。

## 首次登录

系统在 MongoDB 中不存在老师账号时会自动创建默认老师：

- 用户名：`teacher`
- 密码：`teacher123`

请上线后立刻在用户管理中修改默认密码，并替换 JWT 密钥。

## 环境变量

### backend/.env

```env
PORT=5000
MONGO_URI=mongodb://mongodb:27017/online-ide
JWT_SECRET=replace-with-a-secure-random-string
DEFAULT_TEACHER_USERNAME=teacher
DEFAULT_TEACHER_PASSWORD=teacher123
CORS_ORIGIN=*
```

### frontend/.env

```env
REACT_APP_API_URL=/api
```

- Docker/Nginx 场景建议保持 `/api`（同域反向代理）
- 本地前端开发模式可改为 `http://<服务器IP>:5000/api`

## API 变更摘要

- `POST /api/auth/login` 登录
- `GET /api/auth/me` 获取当前用户
- `GET/POST/PUT/DELETE /api/users` 老师用户管理
- `GET/POST /api/submissions...` 提交与查看提交
- `GET/POST/PUT/DELETE /api/files` 仅访问本人文件
- `POST /api/execute` 需登录且具备运行权限

## 前端使用流程

- 老师：
  - 登录后可打开「用户管理」添加/删除学生或老师账号
  - 在「学生提交」中查看并载入学生提交代码
- 学生：
  - 仅看到自己的文件列表
  - 点击「提交给老师」选择老师并提交
  - 在「我的提交」查看历史提交

## 局域网/公网部署建议

1. 使用 Docker Compose 在服务器启动服务。
2. 通过 `服务器IP:3000` 统一访问前端。
3. 使用 Nginx `/api` 代理后端，避免浏览器跨域配置复杂化。
4. 公网部署建议再加一层反向代理（如 Caddy/Nginx）并启用 HTTPS。

## 目录结构

```text
online-IDE/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── bootstrap/seedDefaultTeacher.js
│   │   ├── middleware/auth.js
│   │   ├── models/{User,File,Submission}.js
│   │   ├── routes/{auth,users,files,execute,submissions}.js
│   │   └── server.js
├── frontend/
│   ├── nginx.conf
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── LoginForm.js
│       │   ├── UserManagement.js
│       │   ├── SubmissionPanel.js
│       │   └── SubmitCodeModal.js
│       └── services/api.js
└── Docker/
```
