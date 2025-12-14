## Swagger UI Locally

### `http://localhost:8080`

```aiignore
docker run --rm -p 8080:8080 \
-e SWAGGER_JSON=/spec/openapi-public.yaml \
-v "%CD%/contracts/dist":/spec \
swaggerapi/swagger-ui
```

## Webhooks Locally

### `http://localhost:8081`

```aiignore
docker run --rm -p 8081:8080 \
  -e SWAGGER_JSON=/spec/openapi-webhooks.yaml \
  -v "%CD%/contracts/dist":/spec \
  swaggerapi/swagger-ui
```

## Graphql Locally

Enable `playground: true` / `graphiql: true;` for the Apollo

### Documentation

For implementation independence the documentation is made as static files.
Interactivity is achieved by connecting `yaml` files directly and parsing them through standalone libraries\
See `contracts/docs`

- If you need to update the parser for Open API you must execute `yarn add -D redoc` and copy parser to the assets. Then `redoc` is no longer needed and can be removed.
- If you need to update the parser for Async API you must execute `yarn add -D @asyncapi/web-component` and copy parser to the assets. Then `@asyncapi/web-component` is no longer needed and can be removed.
