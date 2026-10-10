"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownText({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="last:mb-0 mb-2 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children }) => (
          <code className="bg-muted px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted rounded-lg p-3 mb-2 overflow-x-auto text-[12px] font-mono">{children}</pre>
        ),
        h1: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
        h2: ({ children }) => <h4 className="text-sm font-bold mb-2">{children}</h4>,
        h3: ({ children }) => <h5 className="text-sm font-semibold mb-1">{children}</h5>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="underline text-primary">{children}</a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-muted-foreground/30 pl-3 mb-2 italic text-muted-foreground">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
