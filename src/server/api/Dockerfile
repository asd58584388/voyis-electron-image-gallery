ARG NODE_VERSION
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose the API port
EXPOSE 3000

CMD ["npm", "run", "dev"]

