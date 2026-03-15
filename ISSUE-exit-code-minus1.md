# Bug Issue: 在线运行偶发/高频返回 `[Exit Code: -1]`

## 1. 问题摘要

在在线 IDE 运行代码时，用户会看到如下错误：

```text
[Error]
Server error please run again
[Exit Code: -1]
```

表现特征：

- Python：高概率/几乎必现
- Node.js / C++：偶发
- 同一份代码多次运行，结果不稳定（有时成功，有时 `-1`）

该问题会直接影响课堂/演示稳定性，属于高优先级可用性故障。

---

## 2. 影响范围

- 受影响接口：`POST /api/execute`
- 受影响语言：`python`、`nodejs`、`cpp`
- 受影响层级：后端执行服务（Docker 容器生命周期管理）
- 用户感知：前端统一显示服务器错误，无法区分真实编译错误与平台故障

---

## 3. 复现步骤（旧逻辑）

1. 启动项目：

```bash
docker compose up --build -d
```

2. 登录后选择 Python，输入极短程序：

```python
print("ok")
```

3. 连续点击“运行”多次。

4. 观察输出区，出现：

```text
[Error]
Server error please run again
[Exit Code: -1]
```

补充：Node.js / C++ 用短程序同样可复现，但概率低于 Python。

---

## 4. 实际结果 vs 期望结果

### 实际结果

- 运行请求返回 `success: false`
- `exitCode: -1`
- 错误文案笼统（无法定位到镜像、超时、编译错误或平台故障）

### 期望结果

- 用户代码正常时，稳定返回正确输出
- 用户代码有问题时，返回对应编译/运行错误，不应被平台错误覆盖
- 平台故障时，返回可诊断错误（如“镜像缺失”“执行超时”）

---

## 5. 根因分析（关键）

### 5.1 核心竞态

旧实现中容器配置使用：

- `HostConfig.AutoRemove = true`

执行流程大致为：

1. `container.start()`
2. `await container.wait()`（程序退出）
3. `await container.logs()`（读取日志）

问题在于：容器退出后因为 `AutoRemove: true` 可能被 Docker 立即删除。若删除发生在步骤 2 和步骤 3 之间，`container.logs()` 会报 “No such container” 之类错误，进而进入统一兜底逻辑，最终向前端返回 `-1`。

### 5.2 为什么 Python 更容易触发

- Python 简短脚本退出非常快
- 容器退出和自动删除发生得更早
- `wait()` 返回后，`logs()` 更容易踩中“容器已不存在”的窗口

Node/C++ 程序运行/编译时长相对更长，竞态窗口触发概率更低，因此表现为“偶发”。

### 5.3 次级问题（放大影响）

- 旧超时分支没有真正 kill 容器（只有注释/空逻辑），存在资源清理不完整风险
- 统一报错 `Server error please run again`，隐藏了真实故障类型

---

## 6. 代码定位

当前仓库相关文件：

- 执行服务：`backend/src/services/dockerService.js`
- 执行路由：`backend/src/routes/execute.js`

与根因相关的关键点：

- 容器自动删除开关
- `wait()` 与 `logs()` 的调用顺序
- 超时后的 kill/remove 清理策略
- 错误映射逻辑（对镜像缺失、超时、容器丢失做区分）

---

## 7. 修复方案（建议/已实施方向）

1. **关闭 AutoRemove**
- 将容器 `AutoRemove` 改为 `false`
- 先读取日志，再显式 `remove({ force: true })`

2. **完善超时治理**
- 超时后主动 `kill` 容器
- `finally` 中统一 `remove`，保证幂等清理

3. **错误可诊断化**
- 镜像缺失：提示需要构建镜像（`docker compose build`）
- 执行超时：返回明确超时文案与专用退出码（例如 124）
- 容器意外丢失：返回对应提示

4. **保留后端日志上下文**
- 打印 `executionId` 便于问题追踪

---

## 8. 验收标准

- Python 短程序连续运行 20 次，不出现 `Exit Code: -1`
- Node.js / C++ 连续运行 20 次，不出现随机 `-1`
- 故意写错代码时，返回编译/运行错误而非服务器泛化错误
- 故意触发超时时，返回超时提示和可区分退出码
- 后端无容器泄漏（`docker ps -a` 不应持续累积执行容器）

---

## 9. 回归测试建议

### 9.1 功能回归

- Python/Node/C++ 成功样例
- Python/Node/C++ 语法错误样例
- stdin 输入样例

### 9.2 稳定性回归

- 每种语言循环执行 50 次
- 并发执行（例如 5~10 并发请求）

### 9.3 运维回归

- 镜像缺失场景
- Docker daemon 短暂异常场景
- 后端重启后再次执行场景

---

## 10. 严重级别建议

- 严重级别：`High`
- 原因：核心能力（在线运行）出现随机失败，直接影响教学与演示可用性

---

## 11. 临时规避（若未合并修复）

- 重试运行（用户体验较差，不推荐长期使用）
- 避免超短脚本频繁触发（治标不治本）
- 通过日志监控 “No such container / No such image” 做告警

---

## 12. Issue 标题建议

- `bug: /api/execute occasionally returns Exit Code -1 due to container auto-remove race`
- `bug: Python run often fails with -1 because logs are read after container auto-removal`

