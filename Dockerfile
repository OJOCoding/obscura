# ============================================================
# Stage 1: Build frontend (Node)
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
# Build outputs to ../dist (project root /app/dist)
RUN npm run build

# ============================================================
# Stage 2: Python runtime
# ============================================================
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir ".[dev]" 2>/dev/null || pip install --no-cache-dir .

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--no-access-log", \
     "--proxy-headers", \
     "--forwarded-allow-ips=*"]
