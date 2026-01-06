FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# ✅ FIX: Utilise npm install au lieu de npm ci (pas de package-lock.json garanti)
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]