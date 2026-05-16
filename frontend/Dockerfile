FROM node:20-bullseye

WORKDIR /app

COPY frontend/package*.json ./

RUN npm cache clean --force
RUN npm install --legacy-peer-deps --include=optional
RUN npm install @rolldown/binding-linux-arm64-gnu --save-optional || true

COPY frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]