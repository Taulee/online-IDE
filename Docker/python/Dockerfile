FROM python:3.11-slim

WORKDIR /code

# 安装常用 Python 包
# 如需图形相关依赖，可恢复安装 matplotlib
# RUN pip install --no-cache-dir numpy pandas

# 创建非 root 用户以提升安全性
RUN useradd -m -s /bin/bash runner
USER runner

CMD ["python3"]
