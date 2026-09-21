FROM node:20-alpine AS build
ARG buildEnvironment=dev-acc-prod
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build:${buildEnvironment}

FROM nginx:1.27.3-alpine AS final
COPY --from=build /app/dist usr/share/nginx/html