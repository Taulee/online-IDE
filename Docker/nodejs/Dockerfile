FROM node:20-slim

WORKDIR /code

# Create non-root user for security
RUN useradd -m -s /bin/bash runner
USER runner

CMD ["node"]
