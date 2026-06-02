FROM node:20-bullseye

WORKDIR /app

COPY frontend/package*.json ./

RUN npm install --legacy-peer-deps --include=optional

COPY frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
