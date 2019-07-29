---
title: Alert Blocks
---

An alert block is a simple container to add some color to draw attention to its content. Alert blocks support both inline and block markdown formatting inside of it. Use three colons `:::` to open and close an alert block. Optionally, include one of the following alert types in the opener to choose the specific style of the block: `vanilla`, `primary`, `secondary`, `success`, `danger|error`, `warning`, `info`, `light`, `dark`

## Alert Block Options

Use three colons to open and close an alert. The opening colons support either an alert style name (See [Styles](#styles) below) or a JSON configuration object on the same line directly following the colons. The following options are supported:

| Option | Example | Description |
|--------|---------|-------------|
| alert | primary | The style of the alert block. See [Styles](#styles) for examples |
| title | Some Code | Displays a header before the alert with the given title |
| autoCollapse | true | When `true`, the element will be displayed in its collapsed state initially. Default: `false` |
{: class="table-striped"}

## Examples

### Basic Syntax

```
:::primary
This is a primary alert block
:::
```

### Advanced Syntax

Use a JSON object to specify options:

```
:::{"alert":"danger","title":"Dangerous Text"}
This text is **dangerous**.
:::
```

:::{"alert":"danger","title":"Dangerous Text"}
This text is **dangerous**.
:::

### Styles

:::vanilla
`vanilla`, default style if none specified.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::primary
`primary`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::secondary
`secondary`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::success
`success`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::error
`danger` or `error`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::warning
`warning`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::info
`info`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::light
`light`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::

:::dark
`dark`

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt tempus ultricies. Sed a purus nec tortor rutrum tincidunt vel at orci. Nulla eu nisi nibh. Cras dapibus non diam vel elementum. Vestibulum sollicitudin urna id viverra cursus. Ut eu sapien sapien. Donec aliquam quam lorem, sit amet gravida diam sodales eget.
:::
