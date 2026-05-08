FROM gcc:13-bookworm

WORKDIR /code

# 创建非 root 用户以提升安全性
RUN useradd -m -s /bin/bash runner
USER runner

CMD ["bash"]
