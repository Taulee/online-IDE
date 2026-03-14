FROM gcc:13-bookworm

WORKDIR /code

# Create non-root user for security
RUN useradd -m -s /bin/bash runner
USER runner

CMD ["bash"]
