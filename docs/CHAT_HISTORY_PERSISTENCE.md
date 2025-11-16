# Chat History Persistence Implementation

## Overview

Implement chat history storage in Appwrite to provide persistent conversations like other LLM chat applications (ChatGPT, Claude, etc.).

## Database Schema

### Collection: `chatMessages`

**Attributes:**
- `userId` (string, required) - User who sent/received the message
- `role` (string, required) - "user" or "assistant"
- `content` (string, required) - Message text
- `parts` (string, required) - JSON string of message parts (text, tool, etc.)
- `toolInvocations` (string, optional) - JSON string of tool calls
- `metadata` (string, optional) - JSON string (token usage, model, etc.)
- `createdAt` (datetime, auto) - Timestamp

**Indexes:**
- userId (ASC)
- $createdAt (DESC)

**Permissions:**
- Read: users (only their own messages)
- Create: users
- Update: any (for server-side updates)
- Delete: users (only their own messages)

## API Endpoints

### GET /api/chat/history
**Purpose:** Load chat history for current user

**Response:**
```typescript
{
  messages: ChatUIMessage[]
}
```

### POST /api/chat/save
**Purpose:** Save a message to history (called after each message)

**Request:**
```typescript
{
  message: ChatUIMessage
}
```

### DELETE /api/chat/history
**Purpose:** Clear all chat history for user

## Implementation

### 1. Save Messages After Completion

In `/app/api/chat/route.ts`, add save logic:

```typescript
onFinish: async ({ text, finishReason, usage, totalUsage, messages }) => {
  // Track tokens
  await incrementTokenUsage(userId, totalUsage.totalTokens);

  // Save messages to history
  const { databases } = await createAdminClient();

  // Save user message
  const userMessage = messages[messages.length - 2]; // Second to last
  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.CHAT_MESSAGES,
    ID.unique(),
    {
      userId,
      role: userMessage.role,
      content: userMessage.content,
      parts: JSON.stringify(userMessage.parts),
      metadata: JSON.stringify({}),
    }
  );

  // Save assistant message
  const assistantMessage = messages[messages.length - 1]; // Last
  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.CHAT_MESSAGES,
    ID.unique(),
    {
      userId,
      role: assistantMessage.role,
      content: text,
      parts: JSON.stringify(assistantMessage.parts),
      toolInvocations: JSON.stringify(assistantMessage.toolInvocations || []),
      metadata: JSON.stringify({
        totalUsage,
        model: 'claude-sonnet-4-20250514',
        finishReason,
      }),
    }
  );
}
```

### 2. Load History on Page Load

In `/app/dashboard/chat/page.tsx`:

```typescript
const { messages, sendMessage } = useChat({
  api: '/api/chat',
  initialMessages: await loadChatHistory(), // Server-side fetch
});

async function loadChatHistory() {
  const user = await getCurrentUser();
  const { databases } = await createAdminClient();

  const history = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.CHAT_MESSAGES,
    [
      Query.equal('userId', user.$id),
      Query.orderAsc('$createdAt'),
      Query.limit(100), // Last 100 messages
    ]
  );

  return history.documents.map((doc: any) => ({
    id: doc.$id,
    role: doc.role,
    content: doc.content,
    parts: JSON.parse(doc.parts),
    toolInvocations: doc.toolInvocations ? JSON.parse(doc.toolInvocations) : undefined,
    metadata: doc.metadata ? JSON.parse(doc.metadata) : undefined,
    createdAt: new Date(doc.$createdAt),
  }));
}
```

### 3. Clear History Button

Add to UI:

```typescript
async function clearHistory() {
  const response = await fetch('/api/chat/history', {
    method: 'DELETE',
  });

  if (response.ok) {
    setMessages([]); // Clear UI
  }
}
```

## Migration Steps

1. **Create Appwrite Collection:**
   - Go to Appwrite Console → Database → `koffers_db`
   - Create collection `chatMessages`
   - Add attributes listed above

2. **Add to appwrite-config.ts:**
```typescript
export const COLLECTIONS = {
  // ... existing
  CHAT_MESSAGES: 'chatMessages',
};
```

3. **Create API endpoints:**
   - `/app/api/chat/history/route.ts` (GET, DELETE)

4. **Update chat API:**
   - Add save logic to `onFinish` callback

5. **Update chat page:**
   - Load initial messages from database
   - Show clear history button

## UX Considerations

### History Retention
- Keep last 100 messages per user
- Auto-delete messages older than 90 days
- Provide "Clear History" button

### Privacy
- Users can only see their own messages
- Clear history deletes permanently
- No admin access to message content

### Performance
- Pagination: Load 50 messages at a time
- Scroll to load more (infinite scroll)
- Cache recent messages client-side

## Cost Analysis

### Appwrite Storage Costs
- Average message: ~500 characters = 0.5 KB
- 100 messages per user = 50 KB
- 1,000 users = 50 MB (negligible)

### Query Costs
- Initial load: 1 query per page visit
- Save: 2 queries per message exchange
- Minimal impact on Appwrite limits

## Future Enhancements

1. **Conversation Threading**
   - Multiple conversation threads
   - Conversation titles
   - Switch between conversations

2. **Search**
   - Full-text search across chat history
   - Filter by date range
   - Search by topic/keyword

3. **Export**
   - Export conversation as PDF
   - Export as JSON
   - Email conversation transcript

4. **Sharing**
   - Share conversation link
   - Public/private conversations
   - Collaboration features
