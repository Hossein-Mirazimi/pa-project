FROM node:14
RUN mkdir -p /usr/app
WORKDIR /usr/app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "start"]