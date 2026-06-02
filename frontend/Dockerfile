FROM node:20-bullseye

WORKDIR /app

COPY frontend/package*.json ./

RUN npm cache clean --force

COPY frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
