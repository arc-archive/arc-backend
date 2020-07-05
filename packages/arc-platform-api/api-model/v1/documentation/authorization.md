# Authorization

**This API is only available to MuleSoft and Salesforce employees.**

To register in the service you have to use you `mulesfot.com` or `salesforce.com` Google accounts.
Event though other emails may pass, you won't be authorized to perform any protected operation.

## Getting authorization token

In the application UI click on the "Log in" button. When authenticated click on profile image to open user menu.
Go to "Tokens" and click "Generate token". Define token properties like expiration time and scopes.

When ready click on "Create" button. In the response you will receive token value that should be used to authorize the request.

## Authenticating the request

Add generated token value to `authorization` header with `Bearer` prefix.

```http
get /me HTTP/1.1
host: ci.advancedrestclient.com
Authorization: Bearer [[generated token]]
```

```javascript
fetch('https://ci.advancedrestclient.com/api/me/test/test-id', {
  method: 'DELETE',
  headers: [['Authorization', 'Bearer "generated token"']]
})
.then((response) => {
  if (response.status === 204) {
    // OK
  } else {
    // Not OK
    return response.json();
  }
})
.then((response) => {
  if (response) {
    console.error(response);
  }
})
```

## Scopes

When creating a token you need to define token scopes. You can use `all` to gain access to all endpoints. However, it is recommended to limit the scope for tokens used in CI environment to reduce effects of token leak.

Note that authenticated user of the web UI application has `all` scope by default.

| Scope | Description |
| ----- | ------ |
| `all` | Allows to access all endpoints |
| `create-test` | To be used to schedule automated test |
| `delete-test` | Allows to remove test from the queue |
| `create-message` | Allows to create ARC info message |
| `delete-message` | Allows to delete ARC info message |
| `schedule-component-build` | Allows to create new build process |

## Revoking a token

To revoke a token issue DELETE request to `/me/tokens/[token id]`. Only owner of the token can delete the token.

```javascript
fetch('https://ci.advancedrestclient.com/api/me/tokens/my-token-id', {
  method: 'DELETE',
  headers: [['Authorization', 'Bearer "generated token"']]
})
.then((response) => {
  if (response.status === 204) {
    // OK
  } else {
    // Not OK
    return response.json();
  }
})
.then((response) => {
  if (response) {
    console.error(response);
  }
})
```
