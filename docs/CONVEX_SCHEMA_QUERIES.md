# Convex Schema, Queries & API Plans

**Version:** 1.0  
**Date:** February 27, 2026  
**Architecture:** Hybrid - Convex for data layer, API services for business logic

---

## 1. Convex Schema Definition

### 1.1 Core Data Tables

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Combined Users table (authentication + profile data)
  users: defineTable({
    // Authentication data
    phone_number: v.string(),
    otp_hash: v.optional(v.string()),
    otp_expires_at: v.optional(v.number()),
    is_verified: v.boolean(),
    last_login: v.optional(v.number()),
    
    // Profile data
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    birth_date: v.optional(v.number()), // Unix timestamp
    gender: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number()
    })),
    location_name: v.optional(v.string()),
    max_distance: v.optional(v.number()), // Default: 50
    age_min: v.optional(v.number()),      // Default: 18
    age_max: v.optional(v.number()),      // Default: 100
    show_me: v.optional(v.string()),      // Default: "everyone"
    
    // Metadata
    created_at: v.number(),
    updated_at: v.number()
  })
    .index("by_phone", ["phone_number"])
    .index("by_verified", ["is_verified"])
    .index("by_location", ["location.latitude", "location.longitude"])
    .searchIndex("search_bio", {
      searchField: "bio",
      filterFields: ["phone_number"]
    }),

  // Profile Photos (separate table for better performance)
  profile_photos: defineTable({
    user_id: v.id("users"),
    photo_url: v.string(),
    is_primary: v.boolean(),
    order_index: v.number(),
    created_at: v.number()
  })
    .index("by_user", ["user_id"])
    .index("by_primary", ["user_id", "is_primary"]),

  // User Interests (separate table for many-to-many relationship)
  user_interests: defineTable({
    user_id: v.id("users"),
    interest_name: v.string(),
    category: v.optional(v.string()),
    created_at: v.number()
  })
    .index("by_user", ["user_id"])
    .index("by_interest", ["interest_name"]),

  // Swiping System
  swipes: defineTable({
    swiper_id: v.id("users"),
    swiped_id: v.id("users"),
    action: v.union(v.literal("like"), v.literal("pass")),
    created_at: v.number()
  })
    .index("by_swiper", ["swiper_id"])
    .index("by_swiped", ["swiped_id"])
    .index("by_pair", ["swiper_id", "swiped_id"])
    .index("by_recent", ["created_at"]),

  // Matches
  matches: defineTable({
    user1_id: v.id("users"),
    user2_id: v.id("users"),
    matched_at: v.number(),
    is_active: v.boolean(),
    created_at: v.number()
  })
    .index("by_user1", ["user1_id"])
    .index("by_user2", ["user2_id"])
    .index("by_active", ["is_active"])
    .index("by_recent", ["matched_at"]),

  // Messages
  messages: defineTable({
    match_id: v.id("matches"),
    sender_id: v.id("users"),
    content: v.string(),
    message_type: v.string(), // "text", "photo", "gif"
    is_read: v.boolean(),
    sent_at: v.number()
  })
    .index("by_match", ["match_id"])
    .index("by_sender", ["sender_id"])
    .index("by_unread", ["match_id", "is_read"])
    .index("by_recent", ["sent_at"]),

  // Subscriptions
  subscriptions: defineTable({
    user_id: v.id("users"),
    plan_type: v.string(), // "free", "premium_monthly", "premium_annual"
    status: v.string(), // "active", "cancelled", "expired"
    started_at: v.number(),
    expires_at: v.optional(v.number()),
    created_at: v.number()
  })
    .index("by_user", ["user_id"])
    .index("by_status", ["status"])
    .index("by_expiry", ["expires_at"]),

  // Reports and Safety
  reports: defineTable({
    reporter_id: v.id("users"),
    reported_user_id: v.id("users"),
    reason: v.string(), // "inappropriate_content", "harassment", "fake_profile"
    description: v.optional(v.string()),
    status: v.string(), // "pending", "resolved", "dismissed"
    created_at: v.number()
  })
    .index("by_reporter", ["reporter_id"])
    .index("by_reported", ["reported_user_id"])
    .index("by_status", ["status"]),

  // User Blocks
  user_blocks: defineTable({
    blocker_id: v.id("users"),
    blocked_id: v.id("users"),
    created_at: v.number()
  })
    .index("by_blocker", ["blocker_id"])
    .index("by_blocked", ["blocked_id"])
    .index("by_pair", ["blocker_id", "blocked_id"]),

  // Notifications
  notifications: defineTable({
    user_id: v.id("users"),
    type: v.string(), // "new_match", "new_message", "profile_view"
    related_id: v.optional(v.string()), // match_id, message_id, etc.
    title: v.string(),
    message: v.string(),
    is_read: v.boolean(),
    created_at: v.number()
  })
    .index("by_user", ["user_id"])
    .index("by_unread", ["user_id", "is_read"])
    .index("by_recent", ["created_at"])
});
```

---

## 2. Convex Query Functions

### 2.1 Authentication Queries

```typescript
// convex/queries/auth.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByPhone = query({
  args: { phone_number: v.string() },
  handler: async ({ db }, { phone_number }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const getCurrentUser = query({
  args: {},
  handler: async ({ db, auth }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const getUserProfileById = query({
  args: { user_id: v.id("users") },
  handler: async ({ db }, { user_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 2.2 Discovery Feed Queries

```typescript
// convex/queries/discovery.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDiscoveryFeed = query({
  args: { 
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async ({ db, auth }, { limit = 20, offset = 0 }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const getUserDiscoveryDetails = query({
  args: { user_id: v.id("users") },
  handler: async ({ db }, { user_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 2.3 Matching Queries

```typescript
// convex/queries/matches.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUserMatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async ({ db, auth }, { limit = 50 }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const getMatchById = query({
  args: { match_id: v.id("matches") },
  handler: async ({ db, auth }, { match_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 2.4 Messaging Queries

```typescript
// convex/queries/messages.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getConversationMessages = query({
  args: { 
    match_id: v.id("matches"),
    limit: v.optional(v.number()),
    before: v.optional(v.number())
  },
  handler: async ({ db, auth }, { match_id, limit = 50, before }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const getUnreadMessageCount = query({
  args: {},
  handler: async ({ db, auth }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 2.5 Profile and Settings Queries

```typescript
// convex/queries/profile.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCurrentUserProfile = query({
  args: {},
  handler: async ({ db, auth }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const searchUsers = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number())
  },
  handler: async ({ db, auth }, { query: searchTerm, limit = 20 }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

---

## 3. Convex Mutation Functions

### 3.1 Authentication Mutations

```typescript
// convex/mutations/auth.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: { phone_number: v.string() },
  handler: async ({ db }, { phone_number }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const setOTP = mutation({
  args: {
    user_id: v.id("users"),
    otp_hash: v.string(),
    expires_at: v.number()
  },
  handler: async ({ db }, { user_id, otp_hash, expires_at }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const verifyUser = mutation({
  args: { user_id: v.id("users") },
  handler: async ({ db }, { user_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const createInitialProfile = mutation({
  args: {
    user_id: v.id("users"),
    first_name: v.string(),
    birth_date: v.number(),
    gender: v.string()
  },
  handler: async ({ db }, { user_id, first_name, birth_date, gender }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 3.2 Profile Mutations

```typescript
// convex/mutations/profile.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateUserProfile = mutation({
  args: {
    user_id: v.id("users"),
    updates: v.object({
      first_name: v.optional(v.string()),
      last_name: v.optional(v.string()),
      birth_date: v.optional(v.number()),
      gender: v.optional(v.string()),
      bio: v.optional(v.string()),
      location: v.optional(v.object({
        latitude: v.number(),
        longitude: v.number()
      })),
      location_name: v.optional(v.string()),
      max_distance: v.optional(v.number()),
      age_min: v.optional(v.number()),
      age_max: v.optional(v.number()),
      show_me: v.optional(v.string())
    })
  },
  handler: async ({ db }, { user_id, updates }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const addProfilePhoto = mutation({
  args: {
    user_id: v.id("users"),
    photo_url: v.string(),
    is_primary: v.boolean()
  },
  handler: async ({ db }, { user_id, photo_url, is_primary }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const removeProfilePhoto = mutation({
  args: { photo_id: v.id("profile_photos") },
  handler: async ({ db }, { photo_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const addUserInterest = mutation({
  args: {
    user_id: v.id("users"),
    interest_name: v.string(),
    category: v.optional(v.string())
  },
  handler: async ({ db }, { user_id, interest_name, category }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const removeUserInterest = mutation({
  args: {
    user_id: v.id("users"),
    interest_name: v.string()
  },
  handler: async ({ db }, { user_id, interest_name }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 3.3 Matching Mutations

```typescript
// convex/mutations/matching.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const recordSwipe = mutation({
  args: {
    swiper_id: v.id("users"),
    swiped_id: v.id("users"),
    action: v.union(v.literal("like"), v.literal("pass"))
  },
  handler: async ({ db }, { swiper_id, swiped_id, action }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const unmatchUsers = mutation({
  args: { match_id: v.id("matches") },
  handler: async ({ db }, { match_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 3.4 Messaging Mutations

```typescript
// convex/mutations/messages.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    match_id: v.id("matches"),
    sender_id: v.id("users"),
    content: v.string(),
    message_type: v.optional(v.string())
  },
  handler: async ({ db }, { match_id, sender_id, content, message_type = "text" }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const markMessageAsRead = mutation({
  args: { message_id: v.id("messages") },
  handler: async ({ db }, { message_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const markConversationAsRead = mutation({
  args: { match_id: v.id("matches"), user_id: v.id("users") },
  handler: async ({ db }, { match_id, user_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

### 3.5 Subscription Mutations

```typescript
// convex/mutations/subscriptions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSubscription = mutation({
  args: {
    user_id: v.id("users"),
    plan_type: v.string(),
    duration_days: v.number()
  },
  handler: async ({ db }, { user_id, plan_type, duration_days }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const cancelSubscription = mutation({
  args: { subscription_id: v.id("subscriptions") },
  handler: async ({ db }, { subscription_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});

export const expireSubscription = mutation({
  args: { subscription_id: v.id("subscriptions") },
  handler: async ({ db }, { subscription_id }) => {
    // Implementation in CONVEX_QUERIES_REFERENCE.md
  }
});
```

---

## 4. API Service Integration Plan

See detailed API endpoints and business logic in [CONVEX_QUERIES_REFERENCE.md](./CONVEX_QUERIES_REFERENCE.md)

---

## 5. Frontend Integration Examples

See React hooks and component examples in [CONVEX_QUERIES_REFERENCE.md](./CONVEX_QUERIES_REFERENCE.md)

---

This document provides the schema structure and function signatures. For detailed pseudocode logic and return types, see the [CONVEX_QUERIES_REFERENCE.md](./CONVEX_QUERIES_REFERENCE.md) file.
  const messages = await convexClient.query(
    api.queries.messages.getConversationMessages,
    {
      match_id: matchId,
      limit: parseInt(limit),
      before: before ? parseInt(before) : undefined
    }
  );
  
  res.json({
    success: true,
    messages
  });
});
```

---

## 5. Frontend Integration Examples

### 5.1 React Hooks Usage

```javascript
// hooks/useDiscoveryFeed.js
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

export function useDiscoveryFeed(limit = 20) {
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const feed = useQuery(api.queries.discovery.getDiscoveryFeed, {
    limit,
    offset
  });
  
  const loadMore = () => {
    if (hasMore && feed?.length === limit) {
      setOffset(prev => prev + limit);
    }
  };
  
  useEffect(() => {
    if (feed && feed.length < limit) {
      setHasMore(false);
    }
  }, [feed, limit]);
  
  return {
    feed: feed || [],
    loadMore,
    hasMore,
    isLoading: feed === undefined
  };
}

// hooks/useCurrentUser.js
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCurrentUser() {
  const user = useQuery(api.queries.profile.getCurrentUserProfile);
  return user;
}

// hooks/useMatches.js
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useMatches(limit = 50) {
  const matches = useQuery(api.queries.matches.getUserMatches, { limit });
  return matches || [];
}

// hooks/useMessages.js
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useMessages(matchId, limit = 50) {
  const messages = useQuery(api.queries.messages.getConversationMessages, {
    match_id: matchId,
    limit
  });
  
  const sendMessage = useMutation(api.mutations.messages.sendMessage);
  
  const send = async (content, messageType = "text") => {
    return await sendMessage({
      match_id: matchId,
      sender_id: "current-user-id", // Get from auth context
      content,
      message_type: messageType
    });
  };
  
  return {
    messages: messages || [],
    sendMessage: send
  };
}
```

### 5.2 Component Examples

```jsx
// components/DiscoveryFeed.jsx
import { useDiscoveryFeed } from "../hooks/useDiscoveryFeed";
import { UserProfileCard } from "./UserProfileCard";

export function DiscoveryFeed() {
  const { feed, loadMore, hasMore, isLoading } = useDiscoveryFeed(20);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="discovery-feed">
      {feed.map(user => (
        <UserProfileCard 
          key={user.user_id} 
          user={user} 
        />
      ))}
      
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          Load More
        </button>
      )}
    </div>
  );
}

// components/ChatWindow.jsx
import { useMessages } from "../hooks/useMessages";
import { useCurrentUser } from "../hooks/useCurrentUser";

export function ChatWindow({ matchId }) {
  const { messages, sendMessage } = useMessages(matchId);
  const currentUser = useCurrentUser();
  const [newMessage, setNewMessage] = useState("");
  
  const handleSend = async () => {
    if (newMessage.trim()) {
      await sendMessage(newMessage.trim());
      setNewMessage("");
    }
  };
  
  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map(msg => (
          <div 
            key={msg.message_id} 
            className={`message ${msg.sender_id === currentUser?.user.user_id ? 'sent' : 'received'}`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
```

---

## 6. Performance Optimization Guidelines

### 6.1 Indexing Strategy
```typescript
// All critical indexes are defined in schema.ts
// Query patterns should match index structures for optimal performance
```

### 6.2 Pagination Best Practices
```typescript
// Use offset-based pagination for small datasets
// Consider cursor-based pagination for large datasets
// Limit page sizes to reasonable numbers (20-50 items)
```

### 6.3 Caching Strategies
```javascript
// Convex handles caching automatically
// Use React Query or SWR for additional client-side caching if needed
// Implement cache invalidation for critical updates
```

### 6.4 Real-time Updates
```javascript
// Convex subscriptions automatically update when data changes
// Use useQuery for automatic real-time updates
// Consider optimistic updates for better UX
```

---

This comprehensive schema and query design provides a solid foundation for your dating app with Convex handling the data layer efficiently while your API services manage complex business logic.