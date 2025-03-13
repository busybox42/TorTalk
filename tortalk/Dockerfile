# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install buffer crypto-js date-fns @types/crypto-js

# Copy client files
COPY . .

# Create a polyfill file for buffer
RUN echo "// src/polyfills.js\nwindow.Buffer = window.Buffer || require('buffer').Buffer;" > src/polyfills.js

# Modify index.js to import the polyfill
RUN sed -i '1s/^/import ".\/polyfills.js";\n/' src/index.tsx || \
    sed -i '1s/^/import ".\/polyfills.js";\n/' src/index.ts || \
    sed -i '1s/^/import ".\/polyfills.js";\n/' src/index.jsx || \
    sed -i '1s/^/import ".\/polyfills.js";\n/' src/index.js

# Build the React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the build output to replace the default nginx contents
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"] 