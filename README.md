# ARC back-end

NPM modules and apps that powers Advanced REST Client API platform.

The platform supports

-   API Components CI process: integration with GitHub, processing, validating, documenting, and releasing components.
-   ARC back-end: messaging, analytics, and planned: user data synchronization
-   API documentation
-   API CI status page
-   API Components coverage report (in progress)

## Version 2

This is a version 2 of the apps. Previous version is at [https://github.com/advanced-rest-client/api-components-apps](https://github.com/advanced-rest-client/api-components-apps).

## Development

This mono repo uses Lerna to manage dependencies. To start developing you need to clone the repository and install dependencies.

```sh
git clone https://github.com/advanced-rest-client/arc-backend
cd arc-backend
npm run bootstrap
```

After the dependencies are installed you can edit any of the packages in the `packages/` directory.
Don't forget to include tests and types definition for each change before you submit a PR.
