import type { MDXComponents } from 'mdx/types';

import * as CodeComponents from 'fumadocs-ui/components/codeblock';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import defaultMdxComponents from 'fumadocs-ui/mdx';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...TabsComponents,
    ...CodeComponents,
    pre: ({ ref: _ref, ...props }) => (
      <CodeComponents.CodeBlock {...props}>
        <CodeComponents.Pre>{props.children}</CodeComponents.Pre>
      </CodeComponents.CodeBlock>
    ),
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
