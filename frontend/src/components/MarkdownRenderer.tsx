import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className = "" }: MarkdownRendererProps) => {
  // Handle empty or null content
  if (!content || content.trim() === '') {
    return <p className="text-sm text-muted-foreground">No content to display</p>;
  }
  
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for markdown elements
          p: ({ children }) => (
            <p className="mb-2 text-sm text-card-foreground last:mb-0">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold mb-2 text-card-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mb-2 text-card-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mb-1 text-card-foreground">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 text-sm text-card-foreground">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 text-sm text-card-foreground">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="mb-1">{children}</li>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-3 bg-muted rounded text-xs font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/20 pl-4 my-2 text-sm text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-card-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-card-foreground">{children}</em>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-primary hover:text-primary/80 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full border border-border rounded text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody>{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-card-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-card-foreground">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
