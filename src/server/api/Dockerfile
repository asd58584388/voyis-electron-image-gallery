ARG NODE_VERSION
FROM node:${NODE_VERSION}-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .
COPY .env.docker .env

# Generate Prisma client and build the production bundle
RUN npm run db:generate

# Expose the API port
EXPOSE 3000



