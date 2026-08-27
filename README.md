# vue-ecommerce

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## Combined Web + API deployment

This project is deployed as one Railway service. Railway runs `npm run build`
to create `dist/`, then starts Express with `npm start`. Express serves the
Vue build and `/api` from the same HTTPS origin, while MySQL remains a private
Railway service.

For local development, run these in separate terminals:

```sh
npm run dev:api
npm run dev
```

Vite proxies `/api` requests to the local API at port 3000. The health endpoint
is available at `/api/health`.
