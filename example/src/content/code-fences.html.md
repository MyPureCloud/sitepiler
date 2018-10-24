---
title: Code Fences
---

The extended fences plugin allows for fancy syntax-highlighted code blocks.

## Fence Options

Use three backticks to open and close a fence. The opening colons support either a title or a JSON configuration object on the same line directly following the colons. The following options are supported:

| Option | Example | Description |
|--------|---------|-------------|
| title | Some Code | Displays a header before the code block with the given title |
| maxHeight | 100pt | Overrides the `max-height` CSS property, must include units | 
| autoCollapse | true | When `true`, the element will be displayed in its collapsed state initially |
| language | java | Syntax highlighting language. Use `nohighlight` to disable. See [Language names and aliases](https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html#language-names-and-aliases). Use the values in the right column. |
| tabsToSpaces | 2 | When specified, replaces all tab characters in the content with the specified number of spaces. |
{: class="table-striped"}

## Examples

### Vanilla markdown

This is the standard markdown code fence. Code highlighting is automatically applied.

```
\```
// Code goes here
\```
```

### Title only

Provide a title for the code block.

```
\``` Some Title Text
// Code goes here
\```
```

### Configuration Object

Specify configuration options as a JSON object.

```
\``` { "title":"Test Heading", "maxHeight": "70pt", "autoCollapse": false, "language": "json", "tabsToSpaces": 2 }
// Code goes here
\```
```


## More examples

### All config options specified

``` { "title":"Test Heading", "maxHeight": "70pt", "autoCollapse": false, "language": "json", "tabsToSpaces": 2 }
{
  "key": "value",
	"array": [
		"value"
	],
	"object": {
    "key": "value"
	}
}
```

### Plain ol' title, language is inferred by highlight.js

``` JavaScript
// Create API instance
var authorizationApi = new platformClient.AuthorizationApi();

// Authenticate
client.loginImplicitGrant(clientId, redirectUri)
  .then(function() {
    // Make request to GET /api/v2/authorization/permissions
    return authorizationApi.getAuthorizationPermissions();
  })
  .catch(function(response) {
    // Handle failure response
    console.log(`${response.status} - ${response.error.message}`);
    console.log(response.error);
  });
```

### Title and language

``` { "title": "Java", "language": "Java"}
// Create ApiClient instance
ApiClient apiClient = ApiClient.Builder.standard()
  // Set access token
  .withAccessToken("BL4Cb3EQIQFlqIItaj-zf5eyhAiP964kucEuOI1g54dKQIgd24P99ojbFHtpgUTudRIkuUYfXMy0afEnZc5nEQ")
  // Set environment
  .withBasePath("https://api.mypurecloud.ie")
  .build();

// Use the ApiClient instance
Configuration.setDefaultApiClient(apiClient);

// Instantiate API
UsersApi usersApi = new UsersApi();

// Get the logged in user
GetUsersMeRequest request = GetUsersMeRequest.builder()
  .withExpand(Collections.singletonList("presence"))
  .build();
UserMe me = usersApi.getUsersMe(request);
System.out.println("Hello " + me.getName());
```

### No title, highlighting turned off

``` { "language": "nohighlight" }
let thisCode = "not highlighted";

## Markdown just displays unrendered

* No
* Lists

or `inline` code
```
