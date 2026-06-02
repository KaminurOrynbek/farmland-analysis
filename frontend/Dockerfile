FROM node:20-bullseye AS build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps --include=optional

COPY frontend/ .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
