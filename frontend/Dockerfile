FROM node:20-bullseye

WORKDIR /app

COPY frontend/package*.json ./
RUN npm cache clean --force && npm install --legacy-peer-deps

# Verify axios is installed during build
RUN ls node_modules/axios

COPY frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


