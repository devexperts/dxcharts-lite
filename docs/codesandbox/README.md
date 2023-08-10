# Codesandbox generator

Generates codesandbox URLs based on the docs folder.

## How it works

Each documentation folder with an example in it should contain at least these files:

-   `index.html (required)` - the main entry point for an example. Generator will parse it's content, read the imports and include them in the sandbox's files;
-   `example.md (optional)` - `md` file, that contains human readable text, that explains some concept of `dxcharts-lite`;
    > `.md` file could be used to auto insert generated codesandbox URL.
-   `...rest files` - rest files will be ignored (if they're not imported via index.html).

Generator looks for example folders in `docs`, parses each of them, and generates a codesandbox URL as an output.

### Auto link codesandbox URL in `.md` files

If you want generator to add a link to a `.md` file inside the folder, you should provide a placeholders to make generator know about where to insert a URL.

Take a look at an example:

```md
<!--CSB_LINK-->[live example](codesandbox_url)<!--/CSB_LINK-->
```

Generator will parse the link between `<!--CSB_LINK-->` tags and replace the url in the `(url)` brackets.

The result will be smth like that:

```md
<!--CSB_LINK-->[live example](https://codesandbox.io/s/fqz71k)<!--/CSB_LINK-->
```

## How to run a generator

```ts
ts-node ./cli/run.ts <path_to_docs>
```
