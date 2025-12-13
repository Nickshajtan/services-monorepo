## Swagger UI Locally
###  `http://localhost:8080`

```aiignore
docker run --rm -p 8080:8080 \
-e SWAGGER_JSON=/spec/openapi-public.yaml \
-v "%CD%/contracts/dist":/spec \
swaggerapi/swagger-ui
```

## Webhooks Locally
###  `http://localhost:8081`
```aiignore
docker run --rm -p 8081:8080 \
  -e SWAGGER_JSON=/spec/openapi-webhooks.yaml \
  -v "%CD%/contracts/dist":/spec \
  swaggerapi/swagger-ui
```
## Graphql Locally
Enable `playground: true` / `graphiql: true;` for the Apollo
