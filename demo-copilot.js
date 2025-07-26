// LLM Copilot Tool Demo
console.log('🤖 LLM Copilot Tool Demo\n');

// Core functions (from our tested implementation)
function sanitizeTitle(title) {
  return title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function generateFilename(date, platform, title) {
  const dateStr = date.toISOString().split('T')[0];
  const sanitizedTitle = sanitizeTitle(title);
  return `${dateStr}_${platform}_${sanitizedTitle}.md`;
}

function convertToMarkdown(conversationData) {
  const { title, date, platform, messages } = conversationData;
  
  let markdown = '---\n';
  markdown += `title: "${title}"\n`;
  markdown += `date: ${date.toISOString().split('T')[0]}\n`;
  markdown += `platform: ${platform}\n`;
  markdown += '---\n\n';
  markdown += `# ${title}\n\n`;
  
  markdown += '## Conversation\n\n';
  for (const message of messages) {
    const roleIcon = message.role === 'user' ? '👤' : '🤖';
    const roleName = message.role === 'user' ? 'User' : 'Assistant';
    markdown += `### ${roleIcon} ${roleName}\n\n`;
    markdown += message.content + '\n\n';
  }
  
  return markdown;
}

// Demo conversation
const demoConversation = {
  title: 'Building a React Component',
  date: new Date('2024-01-15T10:30:00Z'),
  platform: 'ChatGPT',
  messages: [
    { 
      role: 'user', 
      content: 'How do I create a reusable Button component in React?' 
    },
    { 
      role: 'assistant', 
      content: 'Here\'s how you can create a reusable Button component:\n\n```jsx\nfunction Button({ children, onClick, variant = "primary" }) {\n  return (\n    <button \n      className={`btn btn-${variant}`}\n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n}\n```\n\nThis component accepts props for customization and can be reused throughout your app.' 
    },
    { 
      role: 'user', 
      content: 'Can you show me how to add TypeScript support?' 
    },
    { 
      role: 'assistant', 
      content: 'Absolutely! Here\'s the TypeScript version:\n\n```tsx\ninterface ButtonProps {\n  children: React.ReactNode;\n  onClick?: () => void;\n  variant?: "primary" | "secondary" | "danger";\n}\n\nfunction Button({ children, onClick, variant = "primary" }: ButtonProps) {\n  return (\n    <button \n      className={`btn btn-${variant}`}\n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n}\n```' 
    }
  ]
};

// Generate output
const filename = generateFilename(demoConversation.date, 'chatgpt', demoConversation.title);
const markdown = convertToMarkdown(demoConversation);

console.log('📁 Generated Filename:');
console.log(filename);
console.log('\n📝 Generated Markdown:');
console.log('─'.repeat(50));
console.log(markdown);
console.log('─'.repeat(50));
console.log('\n✅ Demo completed successfully!');
