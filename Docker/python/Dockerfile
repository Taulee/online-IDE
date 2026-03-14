FROM python:3.11-slim

WORKDIR /code

# Install common Python packages
RUN pip install --no-cache-dir numpy pandas matplotlib

# Create non-root user for security
RUN useradd -m -s /bin/bash runner
USER runner

CMD ["python3"]
