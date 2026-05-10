## agent 不可修改部分：

### 1. 每次更改后，同步修改此文件中 “需要 agent 每次执行任务自动更新部分：”。

### 2. 注释全部用中文。如发现现存英文注释， 修改为中文。

### 3.

## 需要 agent 每次执行任务自动更新部分：

### 项目架构：

```text
online-IDE/
├── README.md                         # 项目说明文档，介绍功能、技术栈、启动方式、API、权限模型和 Docker 执行链路。
├── 数据字典.md                       # 项目数据字典，整理数据库集合、字段、枚举、关系和主要 API 数据对象。
├── ISSUE-exit-code-minus1.md         # 问题记录文档，说明执行服务曾出现 Exit Code -1 的原因、复现和修复思路。
├── .gitignore                        # Git 忽略规则，避免提交依赖、构建产物、环境变量等本地文件。
├── docker-compose.yml                # Docker Compose 编排文件，定义前端、后端、MongoDB 和各语言运行镜像的启动方式。
├── agents.md                         # 当前文件，用文件树形式说明项目架构和每个文件的作用。
│
├── Docker/                           # 代码运行沙箱镜像目录，为不同语言准备独立 Docker 镜像。
│   ├── python/                       # Python 运行环境镜像目录。
│   │   └── Dockerfile                # 构建 online-ide-python 镜像，提供 Python 代码执行环境。
│   ├── cpp/                          # C++ 编译运行环境镜像目录。
│   │   └── Dockerfile                # 构建 online-ide-cpp 镜像，提供 g++ 编译和运行环境。
│   └── nodejs/                       # Node.js 运行环境镜像目录。
│       └── Dockerfile                # 构建 online-ide-nodejs 镜像，提供 JavaScript/Node.js 执行环境。
│
├── backend/                          # 后端服务目录，负责 API、鉴权、数据库访问、Docker 代码执行和 AI 教学指导。
│   ├── package.json                  # 后端 Node.js 项目配置，声明启动脚本和 Express、Mongoose、dockerode 等依赖。
│   ├── Dockerfile                    # 后端服务镜像构建文件，用于把 Express API 打包成 Docker 服务。
│   ├── .env.example                  # 后端环境变量示例，包括端口、MongoDB 地址、JWT 密钥、默认老师账号、AI 默认模型和超时等配置。
│   └── src/                          # 后端源码目录。
│       ├── server.js                 # 后端入口文件，创建 Express 应用，注册路由，连接 MongoDB，并启动服务。
│       ├── middleware/               # Express 中间件目录，放置请求进入路由前需要执行的公共逻辑。
│       │   └── auth.js               # JWT 鉴权和权限检查中间件，负责识别当前用户和判断操作权限。
│       ├── models/                   # MongoDB 数据模型目录，定义数据库集合结构。
│       │   ├── User.js               # 用户模型，保存用户名、密码哈希、角色、权限、账号状态等信息。
│       │   ├── userModel.js          # 旧版或兼容用用户模型文件，和用户数据结构相关，实际学习时优先看 User.js。
│       │   ├── File.js               # 文件模型，保存用户自己的代码文件名称、内容、语言和所属用户。
│       │   ├── Submission.js         # 提交模型，保存学生提交给老师的代码、语言、文件名和提交关系。
│       │   └── SystemSetting.js      # 系统配置模型，保存全局配置，例如系统级 AI API 密钥的加密数据。
│       ├── routes/                   # API 路由目录，每个文件负责一组 HTTP 接口。
│       │   ├── auth.js               # 登录和当前用户信息接口，负责账号密码校验、签发 JWT、返回登录用户信息。
│       │   ├── execute.js            # 代码执行接口，接收代码、语言和 stdin；运行失败后可按需调用 AI 教学指导接口。
│       │   ├── files.js              # 个人文件接口，负责代码文件的保存、读取、更新和删除。
│       │   ├── users.js              # 用户管理接口，供老师创建、修改、停用用户和调整权限。
│       │   ├── submissions.js        # 代码提交接口，负责学生提交代码、查看自己的提交、老师查看收到的提交。
│       │   └── aiSettings.js         # AI 设置接口，供有用户管理权限的老师配置系统级 AI API 地址、模型和密钥。
│       ├── services/                 # 后端业务服务目录，放置比路由更复杂的核心逻辑。
│       │   ├── dockerService.js      # Docker 执行核心服务，创建临时目录和容器，运行代码，收集 stdout/stderr，并清理资源。
│       │   └── aiTutorService.js     # AI 教学指导服务，保存/读取系统级 AI 配置，并按需基于运行错误生成出错原因、知识点和更正样例。
│       ├── utils/                    # 工具函数目录，放置可复用的小型业务辅助逻辑。
│       │   └── permissions.js        # 权限工具，定义老师和学生的默认权限结构。
│       └── bootstrap/                # 启动初始化逻辑目录。
│           └── seedDefaultTeacher.js # 后端启动时创建默认老师账号，保证系统首次启动后可以登录管理。
│
├── frontend/                         # 前端服务目录，负责浏览器界面、编辑器、登录状态和 API 调用。
│   ├── package.json                  # 前端 React 项目配置，声明启动、构建脚本和 React、Axios、Monaco Editor 等依赖。
│   ├── Dockerfile                    # 前端镜像构建文件，通常先构建 React 静态资源，再用 Nginx 提供访问。
│   ├── nginx.conf                    # Nginx 配置，提供前端静态文件，并把 /api 请求反向代理到后端服务。
│   ├── .env.example                  # 前端环境变量示例，主要配置 REACT_APP_API_URL 作为后端 API 地址。
│   ├── public/                       # React 公共静态资源目录。
│   │   └── index.html                # 前端 HTML 模板，React 应用最终挂载到这个页面中的 root 节点。
│   └── src/                          # 前端源码目录。
│       ├── index.js                  # React 入口文件，把 App 组件挂载到 public/index.html 的 root 节点。
│       ├── App.js                    # 前端主组件，管理登录状态、代码内容、语言、文件、提交面板和运行按钮等核心状态。
│       ├── services/                 # 前端服务目录，封装和后端 API 的通信。
│       │   └── api.js                # Axios API 封装，统一设置 baseURL、JWT 请求头，并导出登录、运行、文件、用户、提交等请求函数。
│       ├── components/               # React 组件目录，每个组件负责一个相对独立的界面功能。
│       │   ├── CodeEditor.js         # 代码编辑器组件，使用 Monaco Editor 显示和编辑 Python/C++/Node.js 代码。
│       │   ├── LanguageSelector.js   # 编程语言选择组件，用于切换 Python、C++、Node.js。
│       │   ├── OutputTerminal.js     # 输出终端组件，用于显示程序运行结果、错误信息、退出码和报错后的 AI 指导按钮。
│       │   ├── FileManager.js        # 文件管理组件，用于列出、加载和删除当前用户保存的代码文件。
│       │   ├── LoginForm.js          # 登录表单组件，负责输入用户名密码、调用登录接口并保存登录状态。
│       │   ├── SubmitCodeModal.js    # 提交代码弹窗组件，学生选择老师并提交当前代码。
│       │   ├── SubmissionPanel.js    # 提交记录面板，学生查看自己的提交，老师查看收到的学生提交并载入代码。
│       │   ├── UserManagement.js     # 用户管理组件，老师用于创建用户、修改角色权限和停用账号。
│       │   ├── AiSettingsModal.js    # AI 设置弹窗组件，老师用于配置硅基流动或其他 OpenAI-compatible API。
│       │   └── AiGuidanceModal.js    # AI 教学指导弹窗组件，按需展示 AI 返回的出错原因、知识点和更正样例。
│       └── styles/                   # 前端样式目录。
│           ├── index.css             # 全局基础样式，影响整个 React 应用的默认页面表现。
│           └── App.css               # 主应用样式，定义布局、头部、编辑器区域、输出区域、按钮和面板等界面样式。
│
└── screenshots/                      # 项目截图目录，用于保存运行界面或问题说明图片。
    └── op.png                        # 项目界面截图或操作截图，用于 README、问题记录或演示材料。
```

### 架构理解重点

学习时建议先按下面顺序阅读：

1. `README.md`：先建立整体概念。
2. `docker-compose.yml`：理解项目由哪些服务组成。
3. `backend/src/server.js`：理解后端如何启动和注册 API。
4. `frontend/src/App.js`：理解前端主页面如何组织功能。
5. `frontend/src/services/api.js`：理解前端如何调用后端。
6. `backend/src/routes/execute.js` 和 `backend/src/services/dockerService.js`：理解“点击运行代码”这条核心链路。
7. `backend/src/services/aiTutorService.js`、`backend/src/routes/aiSettings.js`、`frontend/src/components/AiSettingsModal.js` 和 `frontend/src/components/AiGuidanceModal.js`：理解系统级 AI 配置和按需报错指导生成。
