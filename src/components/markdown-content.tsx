import type { ComponentPropsWithoutRef } from "react";

import { cn } from "cn";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("space-y-4 text-foreground text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: () => null,
          a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
            const isSafe = href && (href.startsWith("http://") || href.startsWith("https://"));
            if (!isSafe) {
              return <span>{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
            <h1 className="mt-6 mb-3 font-bold text-foreground text-xl tracking-tight first:mt-0" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
            <h2 className="mt-5 mb-2.5 font-semibold text-foreground text-lg tracking-tight first:mt-0" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
            <h3 className="mt-4 mb-2 font-semibold text-base text-foreground first:mt-0" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }: ComponentPropsWithoutRef<"p">) => (
            <p className="text-muted-foreground leading-relaxed last:mb-0" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul">) => (
            <ul className="my-3 ml-6 list-disc space-y-1 text-muted-foreground" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol">) => (
            <ol className="my-3 ml-6 list-decimal space-y-1 text-muted-foreground" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }: ComponentPropsWithoutRef<"li">) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }: ComponentPropsWithoutRef<"blockquote">) => (
            <blockquote className="my-3 border-primary/40 border-l-4 pl-4 text-muted-foreground italic" {...props}>
              {children}
            </blockquote>
          ),
          strong: ({ children, ...props }: ComponentPropsWithoutRef<"strong">) => (
            <strong className="font-semibold text-foreground" {...props}>
              {children}
            </strong>
          ),
          hr: (props: ComponentPropsWithoutRef<"hr">) => <hr className="my-6 border-border" {...props} />,
          code: ({ children, className: codeClassName, ...props }: ComponentPropsWithoutRef<"code">) => (
            <code
              className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs", codeClassName)}
              {...props}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
