# Changelog

The build process for a component includes generating a changelog and storing it in 1) the `CHANGELOG.md` file of the component and 2) inserting changelog data to the datastore. This information can be retreived using this API.

## Using changelog API

### Web app

Go to [change log status page](https://ci.advancedrestclient.com/#/changelog) and provide date range for your query. The date range limits the list of results to a components released in this time period.

Note, the CI app was created in December, 2018. Components released before that may not be available.

It is possible to add tags to the query to limit the list of results to specific group of components.

Tags can be (but not limited to):
-   `apic` - The component is used in API console
-   `arc` - The component is used in Advanced REST Client
-   `amf` - The component uses AMF data model.

### REST API

Make a request to `https://api.advancedrestclient.com/v1/components/versions` endpoint.

Add `skip-docs=true` query parameter to only download the changelog. Otherwise it also returns generated data model for the documentation which can be large (in tens of KB).

Add `since` and `until` request parameters which contains a timestamp to the correspoding value to limit the list of results.

Add `tags` query parameter (it is an array) to get lit of results for specific group of components.

**Example url:**

```
https://api.advancedrestclient.com/v1/components/versions?skip-docs=true&since=1514793600000&until=1543712400000&tags=apic&tags=arc
```
