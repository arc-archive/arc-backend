# ARC API platform JWT library

Provides a common interface for the ARC API platform apps and libraries to process user authentication tokens.

## Usage

### Installation
```
npm install @advanced-rest-client/api-tokens --save
```

### Verifying a token

```javascript
import { verifyToken, hasScope } from '@advanced-rest-client/api-tokens';

try {
  const token = await verifyToken(tokenString);
  if (!hasScope(token, 'my-scope')) {
    throw new Error('User has no access to this resource.');
  }
  console.log(token);
} catch (e) {
  console.log(e.message);
}
```
