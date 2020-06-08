# backend-models

Models definition and datastore interface for Advanced REST Client back-end apps.

The models contains definitions for:

-   ARC platform
    -   ARC analytics
    -   ARC in-app messages
-   CI platform
    -   Components tests
    -   Components coverage
    -   Components documentation
    -   Components catalogue
    -   Users
    -   User authentication tokens

It's a separate module so applications can include them separately.

Note, in previous version of the ARC CI platform models were scheduling tasks in
the background apps via PubSub system. These models don't do this any more and
only communicate with the GCE data store.
