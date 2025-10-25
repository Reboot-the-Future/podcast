"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface MarkdownContentProps {
  content: string;
  className?: string;
  isDark?: boolean;
}

export default function MarkdownContent({ content, className = "", isDark = false }: MarkdownContentProps) {
  return (
    <div className={`whitespace-pre-line leading-tight sm:leading-snug lg:leading-normal ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Customize link styling
          a: ({ node, ...props }) => (
            <a
              {...props}
              className={`underline ${isDark ? 'text-[#d97ac8] hover:text-[#ffa9fc]' : 'text-[#c84a8a] hover:text-[#d97ac8]'} transition-colors font-medium`}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // Customize bold/strong styling - ensure brand black on light theme
          strong: ({ node, ...props }) => (
            <strong {...props} className={`${isDark ? 'text-inherit' : 'text-[#0F1C1C]'} font-bold`} />
          ),
          // Customize paragraph styling - compact but readable spacing
          p: ({ node, ...props }) => (
            <p {...props} className="mb-1.5 sm:mb-2 last:mb-0" />
          ),
          // Customize em/italic styling
          em: ({ node, ...props }) => (
            <em {...props} className="italic" />
          ),
          // Handle line breaks - preserve them
          br: () => <br className="block" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
