# this files includes some shit we've changed with czaja
FROM node:24-alpine AS base

WORKDIR /app
RUN apk add --no-cache curl wget

# All deps stage
FROM base AS deps
ADD package.json package-lock.json ./
RUN npm ci

# Production only deps stage
FROM base AS production-deps
ADD package.json package-lock.json ./
RUN npm ci --omit=dev

# Production stage
FROM production-deps
# docker mount magic: mount the context dir into /source, mount devdeps into /source/node_modules, mount tmpfs on /tmp to omit tmp files from the image
#  start the build, then move build files into the image - no copying between stages 😎
RUN --mount=type=bind,dst=/source,rw \
    --mount=type=bind,from=deps,source=/app/node_modules,dst=/source/node_modules \
    --mount=type=tmpfs,dst=/tmp \
    cd /source &&\
    node ace build &&\
    rm /source/build/package.json /source/build/package-lock.json &&\
    mv /source/build/* /app
ENV NODE_ENV=production

# proxy port
EXPOSE 8080
CMD ["sh", "/app/start.sh"]
