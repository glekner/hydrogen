<!-- This file is generated from source code in the Shopify/hydrogen repo. Edit the files in /packages/hydrogen/src/components/LocalizationProvider and run 'yarn generate-docs' at the root of this repo. For more information, refer to https://github.com/Shopify/shopify-dev/blob/master/content/internal/operations/hydrogen-reference-docs.md. -->

The `useCountry` hook returns a tuple of the current localization country and a function for updating it.
It must be a descendent of a `LocalizationProvider` component.

## Example code

```tsx
import {LocalizationProvider} from '@shopify/hydrogen';

export function Component() {
  return <LocalizationProvider>{children}</LocalizationProvider>;
}
```

## Component type

The `LocalizationProvider` component is a server component, which means that it renders on the server. For more information about component types, refer to [React Server Components](/custom-storefronts/hydrogen/framework/react-server-components).

## Related hooks

- [`useCountry`](/api/hydrogen/hooks/localization/usecountry)
- [`useAvailableCountries`](/api/hydrogen/hooks/localization/useavailablecountries)
