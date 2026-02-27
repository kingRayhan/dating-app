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
    return await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", phone_number))
      .unique();
  }
});

export const getCurrentUser = query({
  args: {},
  handler: async ({ db, auth }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) return null;
    
    return await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
  }
});

export const getUserProfileById = query({
  args: { user_id: v.id("users") },
  handler: async ({ db }, { user_id }) => {
    const user = await db.get(user_id);
    if (!user) return null;
    
    const photos = await db
      .query("profile_photos")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .collect();
    
    const interests = await db
      .query("user_interests")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .collect();
    
    return {
      user: {
        user_id: user._id,
        phone_number: user.phone_number,
        is_verified: user.is_verified,
        last_login: user.last_login
      },
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        birth_date: user.birth_date,
        gender: user.gender,
        bio: user.bio,
        location: user.location,
        location_name: user.location_name,
        max_distance: user.max_distance,
        age_min: user.age_min,
        age_max: user.age_max,
        show_me: user.show_me
      },
      photos: photos.sort((a, b) => a.order_index - b.order_index),
      interests: interests.map(i => i.interest_name)
    };
  }
});
```

### 2.2 Discovery Feed Queries

```typescript
// convex/queries/discovery.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate age from birth date
function calculateAge(birthDateTimestamp: number): number {
  const birthDate = new Date(birthDateTimestamp);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Helper function to calculate distance (simplified)
function calculateDistance(loc1: any, loc2: any): number {
  // Simplified haversine formula
  const R = 6371; // Earth radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const getDiscoveryFeed = query({
  args: { 
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async ({ db, auth }, { limit = 20, offset = 0 }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get current user
    const currentUser = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
    
    if (!currentUser) throw new Error("User not found");
    
    // Check if user has complete profile
    if (!currentUser.location || !currentUser.birth_date) {
      return []; // No location or birth date set
    }
    
    // Set defaults for profile preferences
    const maxDistance = currentUser.max_distance ?? 50;
    const ageMin = currentUser.age_min ?? 18;
    const ageMax = currentUser.age_max ?? 100;
    const showMe = currentUser.show_me ?? "everyone";
    
    // Calculate age range timestamps
    const now = Date.now();
    const minBirthDate = now - (ageMax * 365 * 24 * 60 * 60 * 1000);
    const maxBirthDate = now - (ageMin * 365 * 24 * 60 * 60 * 1000);
    
    // Get all potential users within age range
    const potentialUsers = await db.query("users")
      .filter(q => 
        q.and(
          q.gt(q.field("birth_date"), minBirthDate),
          q.lt(q.field("birth_date"), maxBirthDate),
          q.neq(q.field("_id"), currentUser._id),
          q.neq(q.field("location"), undefined) // Has location
        )
      )
      .collect();
    
    // Filter by location and preferences
    const filteredUsers = potentialUsers
      .filter(user => {
        // Distance check
        const distance = calculateDistance(currentUser.location!, user.location!);
        if (distance > maxDistance) return false;
        
        // Show preference check
        if (showMe !== "everyone") {
          const userGender = user.gender?.toLowerCase();
          const showPreference = showMe.toLowerCase();
          
          if (showPreference === "men" && userGender !== "male") return false;
          if (showPreference === "women" && userGender !== "female") return false;
        }
        
        return true;
      })
      .map(user => ({
        ...user,
        distance: calculateDistance(currentUser.location!, user.location!)
      }))
      .sort((a, b) => a.distance - b.distance); // Sort by distance
    
    // Remove already swiped users
    const swipes = await db
      .query("swipes")
      .withIndex("by_swiper", q => q.eq("swiper_id", currentUser._id))
      .collect();
    
    const swipedIds = new Set(swipes.map(s => s.swiped_id));
    const unswipedUsers = filteredUsers.filter(u => !swipedIds.has(u._id));
    
    // Paginate results
    return unswipedUsers.slice(offset, offset + limit).map(user => ({
      user_id: user._id,
      first_name: user.first_name,
      age: user.birth_date ? calculateAge(user.birth_date) : null,
      bio: user.bio,
      distance_km: Math.round(user.distance * 10) / 10,
      photos: [] // Will be populated in frontend or additional query
    }));
  }
});

export const getUserDiscoveryDetails = query({
  args: { user_id: v.id("users") },
  handler: async ({ db }, { user_id }) => {
    const user = await db.get(user_id);
    if (!user) return null;
    
    const photos = await db
      .query("profile_photos")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .filter(q => q.eq(q.field("is_primary"), true))
      .collect();
    
    const interests = await db
      .query("user_interests")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .take(5); // Limit to 5 interests
    
    return {
      user_id: user._id,
      first_name: user.first_name,
      age: user.birth_date ? calculateAge(user.birth_date) : null,
      bio: user.bio,
      photos: photos.map(p => p.photo_url),
      interests: interests.map(i => i.interest_name),
      location_name: user.location_name
    };
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
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const currentUser = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
    
    if (!currentUser) return [];
    
    // Get matches where user is user1
    const matches1 = await db
      .query("matches")
      .withIndex("by_user1", q => q.eq("user1_id", currentUser._id))
      .filter(q => q.eq(q.field("is_active"), true))
      .order("desc")
      .take(limit);
    
    // Get matches where user is user2
    const matches2 = await db
      .query("matches")
      .withIndex("by_user2", q => q.eq("user2_id", currentUser._id))
      .filter(q => q.eq(q.field("is_active"), true))
      .order("desc")
      .take(limit);
    
    // Combine and deduplicate
    const allMatchIds = new Set([...matches1, ...matches2].map(m => m._id));
    const uniqueMatches = [...allMatchIds].map(id => 
      matches1.find(m => m._id === id) || matches2.find(m => m._id === id)
    ).slice(0, limit);
    
    // Get match details
    const matchDetails = await Promise.all(
      uniqueMatches.map(async (match) => {
        const otherUserId = match.user1_id === currentUser._id 
          ? match.user2_id 
          : match.user1_id;
        
        const otherUser = await db.get(otherUserId);
        const otherProfile = await db
          .query("user_profiles")
          .withIndex("by_user", q => q.eq("user_id", otherUserId))
          .unique();
        
        const primaryPhoto = await db
          .query("profile_photos")
          .withIndex("by_primary", q => 
            q.and(q.eq("user_id", otherUserId), q.eq("is_primary", true))
          )
          .unique();
        
        // Get last message
        const lastMessage = await db
          .query("messages")
          .withIndex("by_match", q => q.eq("match_id", match._id))
          .order("desc")
          .first();
        
        return {
          match_id: match._id,
          user: {
            user_id: otherUser._id,
            first_name: otherProfile?.first_name || "",
            photo_url: primaryPhoto?.photo_url || null
          },
          matched_at: match.matched_at,
          last_message: lastMessage ? {
            content: lastMessage.content,
            sent_at: lastMessage.sent_at,
            is_read: lastMessage.is_read
          } : null
        };
      })
    );
    
    return matchDetails;
  }
});

export const getMatchById = query({
  args: { match_id: v.id("matches") },
  handler: async ({ db, auth }, { match_id }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const match = await db.get(match_id);
    if (!match) return null;
    
    // Verify user is part of this match
    const currentUser = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
    
    if (currentUser?._id !== match.user1_id && currentUser?._id !== match.user2_id) {
      throw new Error("Unauthorized access to match");
    }
    
    return match;
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
    before: v.optional(v.number()) // timestamp for pagination
  },
  handler: async ({ db, auth }, { match_id, limit = 50, before }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Verify user has access to this conversation
    const currentUser = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
    
    const match = await db.get(match_id);
    if (!match || 
        (match.user1_id !== currentUser?._id && match.user2_id !== currentUser?._id)) {
      throw new Error("Unauthorized access to conversation");
    }
    
    // Get messages
    let messageQuery = db
      .query("messages")
      .withIndex("by_match", q => q.eq("match_id", match_id));
    
    if (before) {
      messageQuery = messageQuery.filter(q => q.lt(q.field("sent_at"), before));
    }
    
    const messages = await messageQuery
      .order("desc")
      .take(limit);
    
    // Mark messages as read (separate mutation would be better for this)
    const unreadMessages = messages.filter(m => 
      m.sender_id !== currentUser?._id && !m.is_read
    );
    
    // Return messages in chronological order
    return messages.reverse().map(msg => ({
      message_id: msg._id,
      sender_id: msg.sender_id,
      content: msg.content,
      message_type: msg.message_type,
      sent_at: msg.sent_at,
      is_read: msg.is_read
    }));
  }
});

export const getUnreadMessageCount = query({
  args: {},
  handler: async ({ db, auth }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) return 0;
    
    const currentUser = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
    
    if (!currentUser) return 0;
    
    // Get user's matches
    const matches1 = await db
      .query("matches")
      .withIndex("by_user1", q => q.eq("user1_id", currentUser._id))
      .filter(q => q.eq(q.field("is_active"), true))
      .collect();
    
    const matches2 = await db
      .query("matches")
      .withIndex("by_user2", q => q.eq("user2_id", currentUser._id))
      .filter(q => q.eq(q.field("is_active"), true))
      .collect();
    
    const allMatches = [...matches1, ...matches2];
    const matchIds = allMatches.map(m => m._id);
    
    if (matchIds.length === 0) return 0;
    
    // Count unread messages across all matches
    const unreadCounts = await Promise.all(
      matchIds.map(async (matchId) => {
        const unreadMessages = await db
          .query("messages")
          .withIndex("by_unread", q => 
            q.and(q.eq("match_id", matchId), q.eq("is_read", false))
          )
          .filter(q => q.neq(q.field("sender_id"), currentUser._id))
          .collect();
        
        return unreadMessages.length;
      })
    );
    
    return unreadCounts.reduce((sum, count) => sum + count, 0);
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
    const identity = await auth.getUserIdentity();
    if (!identity) return null;
    
    const user = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
    
    if (!user) return null;
    
    const photos = await db
      .query("profile_photos")
      .withIndex("by_user", q => q.eq("user_id", user._id))
      .collect();
    
    const interests = await db
      .query("user_interests")
      .withIndex("by_user", q => q.eq("user_id", user._id))
      .collect();
    
    const subscription = await db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("user_id", user._id))
      .filter(q => q.eq(q.field("status"), "active"))
      .first();
    
    return {
      user: {
        user_id: user._id,
        phone_number: user.phone_number,
        is_verified: user.is_verified,
        last_login: user.last_login
      },
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        birth_date: user.birth_date,
        gender: user.gender,
        bio: user.bio,
        location: user.location,
        location_name: user.location_name,
        max_distance: user.max_distance ?? 50,
        age_min: user.age_min ?? 18,
        age_max: user.age_max ?? 100,
        show_me: user.show_me ?? "everyone"
      },
      photos: photos
        .sort((a, b) => a.order_index - b.order_index)
        .map(photo => ({
          photo_id: photo._id,
          url: photo.photo_url,
          is_primary: photo.is_primary,
          order_index: photo.order_index
        })),
      interests: interests.map(i => i.interest_name),
      subscription: subscription ? {
        plan_type: subscription.plan_type,
        status: subscription.status,
        expires_at: subscription.expires_at
      } : null
    };
  }
});

export const searchUsers = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number())
  },
  handler: async ({ db, auth }, { query: searchTerm, limit = 20 }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) return [];
    
    const currentUser = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", identity.phone))
      .unique();
    
    if (!currentUser) return [];
    
    // Search by first name in users table
    const matchingUsers = await db
      .query("users")
      .filter(q => 
        q.and(
          q.neq(q.field("_id"), currentUser._id),
          q.search("first_name", searchTerm)
        )
      )
      .take(limit);
    
    // Get full details for matching users
    const userDetails = matchingUsers.map(user => ({
      user_id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      bio: user.bio,
      photo_url: null, // Will be populated with primary photo
      location_name: user.location_name
    }));
    
    // Add primary photos
    const userDetailsWithPhotos = await Promise.all(
      userDetails.map(async (userDetail) => {
        const primaryPhoto = await db
          .query("profile_photos")
          .withIndex("by_primary", q => 
            q.and(q.eq("user_id", userDetail.user_id), q.eq("is_primary", true))
          )
          .unique();
        
        return {
          ...userDetail,
          photo_url: primaryPhoto?.photo_url || null
        };
      })
    );
    
    return userDetailsWithPhotos;
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
    // Check if user already exists
    const existingUser = await db
      .query("users")
      .withIndex("by_phone", q => q.eq("phone_number", phone_number))
      .unique();
    
    if (existingUser) {
      return { user_id: existingUser._id, existed: true };
    }
    
    // Create new user
    const userId = await db.insert("users", {
      phone_number,
      is_verified: false,
      created_at: Date.now(),
      updated_at: Date.now()
    });
    
    return { user_id: userId, existed: false };
  }
});

export const setOTP = mutation({
  args: {
    user_id: v.id("users"),
    otp_hash: v.string(),
    expires_at: v.number()
  },
  handler: async ({ db }, { user_id, otp_hash, expires_at }) => {
    await db.patch(user_id, {
      otp_hash,
      otp_expires_at: expires_at,
      updated_at: Date.now()
    });
  }
});

export const verifyUser = mutation({
  args: { user_id: v.id("users") },
  handler: async ({ db }, { user_id }) => {
    await db.patch(user_id, {
      is_verified: true,
      last_login: Date.now(),
      updated_at: Date.now()
    });
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
    // Update existing user with profile data
    await db.patch(user_id, {
      first_name,
      birth_date,
      gender,
      max_distance: 50,
      age_min: 18,
      age_max: 100,
      show_me: "everyone",
      updated_at: Date.now()
    });
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
    // Update user profile data directly
    await db.patch(user_id, {
      ...updates,
      updated_at: Date.now()
    });
  }
});

export const addProfilePhoto = mutation({
  args: {
    user_id: v.id("users"),
    photo_url: v.string(),
    is_primary: v.boolean()
  },
  handler: async ({ db }, { user_id, photo_url, is_primary }) => {
    // If setting as primary, unset current primary
    if (is_primary) {
      const currentPrimary = await db
        .query("profile_photos")
        .withIndex("by_primary", q => 
          q.and(q.eq("user_id", user_id), q.eq("is_primary", true))
        )
        .unique();
      
      if (currentPrimary) {
        await db.patch(currentPrimary._id, { is_primary: false });
      }
    }
    
    // Get next order index
    const existingPhotos = await db
      .query("profile_photos")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .collect();
    
    const orderIndex = existingPhotos.length;
    
    const photoId = await db.insert("profile_photos", {
      user_id,
      photo_url,
      is_primary,
      order_index: orderIndex,
      created_at: Date.now()
    });
    
    return photoId;
  }
});

export const removeProfilePhoto = mutation({
  args: { photo_id: v.id("profile_photos") },
  handler: async ({ db }, { photo_id }) => {
    await db.delete(photo_id);
  }
});

export const addUserInterest = mutation({
  args: {
    user_id: v.id("users"),
    interest_name: v.string(),
    category: v.optional(v.string())
  },
  handler: async ({ db }, { user_id, interest_name, category }) => {
    // Check if interest already exists
    const existingInterest = await db
      .query("user_interests")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .filter(q => q.eq(q.field("interest_name"), interest_name))
      .unique();
    
    if (existingInterest) return existingInterest._id;
    
    const interestId = await db.insert("user_interests", {
      user_id,
      interest_name,
      category,
      created_at: Date.now()
    });
    
    return interestId;
  }
});

export const removeUserInterest = mutation({
  args: {
    user_id: v.id("users"),
    interest_name: v.string()
  },
  handler: async ({ db }, { user_id, interest_name }) => {
    const interest = await db
      .query("user_interests")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .filter(q => q.eq(q.field("interest_name"), interest_name))
      .unique();
    
    if (interest) {
      await db.delete(interest._id);
    }
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
    // Check if swipe already exists
    const existingSwipe = await db
      .query("swipes")
      .withIndex("by_pair", q => 
        q.and(q.eq("swiper_id", swiper_id), q.eq("swiped_id", swiped_id))
      )
      .unique();
    
    if (existingSwipe) {
      throw new Error("Swipe already recorded");
    }
    
    // Record the swipe
    const swipeId = await db.insert("swipes", {
      swiper_id,
      swiped_id,
      action,
      created_at: Date.now()
    });
    
    let matchId = null;
    let isMatch = false;
    
    // Check for mutual like (match)
    if (action === "like") {
      const reverseSwipe = await db
        .query("swipes")
        .withIndex("by_pair", q => 
          q.and(q.eq("swiper_id", swiped_id), q.eq("swiped_id", swiper_id))
        )
        .filter(q => q.eq(q.field("action"), "like"))
        .unique();
      
      if (reverseSwipe) {
        // Create match
        matchId = await db.insert("matches", {
          user1_id: swiper_id,
          user2_id: swiped_id,
          matched_at: Date.now(),
          is_active: true,
          created_at: Date.now()
        });
        
        isMatch = true;
      }
    }
    
    return {
      swipe_id: swipeId,
      is_match: isMatch,
      match_id: matchId
    };
  }
});

export const unmatchUsers = mutation({
  args: { match_id: v.id("matches") },
  handler: async ({ db }, { match_id }) => {
    await db.patch(match_id, {
      is_active: false,
      updated_at: Date.now()
    });
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
    // Verify user is part of the match
    const match = await db.get(match_id);
    if (!match || 
        (match.user1_id !== sender_id && match.user2_id !== sender_id)) {
      throw new Error("Unauthorized to send message in this conversation");
    }
    
    // Check if match is active
    if (!match.is_active) {
      throw new Error("Cannot message in inactive match");
    }
    
    const messageId = await db.insert("messages", {
      match_id,
      sender_id,
      content,
      message_type,
      is_read: false,
      sent_at: Date.now()
    });
    
    // Create notification for recipient
    const recipientId = match.user1_id === sender_id ? match.user2_id : match.user1_id;
    
    await db.insert("notifications", {
      user_id: recipientId,
      type: "new_message",
      related_id: messageId,
      title: "New Message",
      message: content.length > 50 ? content.substring(0, 50) + "..." : content,
      is_read: false,
      created_at: Date.now()
    });
    
    return messageId;
  }
});

export const markMessageAsRead = mutation({
  args: { message_id: v.id("messages") },
  handler: async ({ db }, { message_id }) => {
    await db.patch(message_id, {
      is_read: true
    });
  }
});

export const markConversationAsRead = mutation({
  args: { match_id: v.id("matches"), user_id: v.id("users") },
  handler: async ({ db }, { match_id, user_id }) => {
    // Get all unread messages in conversation sent by the other user
    const match = await db.get(match_id);
    if (!match) return;
    
    const otherUserId = match.user1_id === user_id ? match.user2_id : match.user1_id;
    
    const unreadMessages = await db
      .query("messages")
      .withIndex("by_match", q => q.eq("match_id", match_id))
      .filter(q => 
        q.and(
          q.eq(q.field("is_read"), false),
          q.eq(q.field("sender_id"), otherUserId)
        )
      )
      .collect();
    
    // Mark all as read
    for (const message of unreadMessages) {
      await db.patch(message._id, { is_read: true });
    }
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
    // Expire any existing active subscriptions
    const existingSubs = await db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("user_id", user_id))
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();
    
    for (const sub of existingSubs) {
      await db.patch(sub._id, {
        status: "cancelled",
        updated_at: Date.now()
      });
    }
    
    // Create new subscription
    const expiresAt = Date.now() + (duration_days * 24 * 60 * 60 * 1000);
    
    const subscriptionId = await db.insert("subscriptions", {
      user_id,
      plan_type,
      status: "active",
      started_at: Date.now(),
      expires_at: expiresAt,
      created_at: Date.now()
    });
    
    return subscriptionId;
  }
});

export const cancelSubscription = mutation({
  args: { subscription_id: v.id("subscriptions") },
  handler: async ({ db }, { subscription_id }) => {
    await db.patch(subscription_id, {
      status: "cancelled",
      updated_at: Date.now()
    });
  }
});

export const expireSubscription = mutation({
  args: { subscription_id: v.id("subscriptions") },
  handler: async ({ db }, { subscription_id }) => {
    await db.patch(subscription_id, {
      status: "expired",
      updated_at: Date.now()
    });
  }
});
```

---

## 4. API Service Integration Plan

### 4.1 Authentication API Endpoints

```javascript
// api/auth/send-otp.js
app.post('/api/v1/auth/send-otp', async (req, res) => {
  const { phone_number } = req.body;
  
  // Business logic validation
  if (!isValidPhoneNumber(phone_number)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  
  // Rate limiting check
  const canSend = await checkRateLimit(phone_number, 'otp');
  if (!canSend) {
    return res.status(429).json({ 
      error: 'Too many OTP requests. Please try again later.' 
    });
  }
  
  // Fraud detection
  const isSuspicious = await detectSuspiciousActivity(phone_number);
  if (isSuspicious) {
    return res.status(403).json({ error: 'Suspicious activity detected' });
  }
  
  // Generate and hash OTP
  const otp = generateSecureOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  // Create/update user in Convex
  const userResult = await convexClient.mutation(
    api.mutations.auth.createUser,
    { phone_number }
  );
  
  // Store OTP hash in Convex
  await convexClient.mutation(
    api.mutations.auth.setOTP,
    {
      user_id: userResult.user_id,
      otp_hash: otpHash,
      expires_at: expiresAt
    }
  );
  
  // Send OTP via Twilio
  try {
    await sendOTPviaTwilio(phone_number, otp);
    res.json({
      success: true,
      message: 'OTP sent successfully',
      expires_in: 300,
      user_exists: userResult.existed
    });
  } catch (error) {
    console.error('Failed to send OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// api/auth/verify-otp.js
app.post('/api/v1/auth/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;
  
  // Validation
  if (!phone_number || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP required' });
  }
  
  // Get user from Convex
  const user = await convexClient.query(
    api.queries.auth.getUserByPhone,
    { phone_number }
  );
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Check OTP expiration
  if (!user.otp_expires_at || Date.now() > user.otp_expires_at) {
    return res.status(401).json({ error: 'OTP expired' });
  }
  
  // Verify OTP
  const isValid = await verifyOTP(otp, user.otp_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }
  
  // Mark user as verified
  await convexClient.mutation(
    api.mutations.auth.verifyUser,
    { user_id: user._id }
  );
  
  // Generate JWT token
  const token = generateJWT(user._id, phone_number);
  
  res.json({
    success: true,
    token,
    user: {
      user_id: user._id,
      phone_number: user.phone_number,
      is_verified: true
    }
  });
});
```

### 4.2 Profile API Endpoints

```javascript
// api/profile/update.js
app.put('/api/v1/profile/me', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const profileData = req.body;
  
  // Business logic validation
  const validationErrors = validateProfileUpdate(profileData);
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }
  
  // Subscription-based limits
  const subscription = await getUserSubscription(userId);
  const limits = getProfileLimits(subscription.plan_type);
  
  // Photo limit check
  if (profileData.photos && profileData.photos.length > limits.max_photos) {
    return res.status(400).json({ 
      error: `Maximum ${limits.max_photos} photos allowed for your plan` 
    });
  }
  
  // Bio length check
  if (profileData.bio && profileData.bio.length > limits.max_bio_length) {
    return res.status(400).json({ 
      error: `Bio must be less than ${limits.max_bio_length} characters` 
    });
  }
  
  // Geocoding if location provided
  if (profileData.location_name && !profileData.location) {
    try {
      const coordinates = await geocodeLocation(profileData.location_name);
      profileData.location = coordinates;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return res.status(400).json({ error: 'Invalid location' });
    }
  }
  
  // Sanitize data
  const sanitizedData = sanitizeProfileData(profileData);
  
  // Update in Convex
  await convexClient.mutation(
    api.mutations.profile.updateUserProfile,
    {
      user_id: userId,
      updates: sanitizedData
    }
  );
  
  res.json({
    success: true,
    message: 'Profile updated successfully'
  });
});

// api/profile/photos.js
app.post('/api/v1/profile/photos', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { photo_base64, is_primary } = req.body;
  
  // Validate image
  if (!photo_base64) {
    return res.status(400).json({ error: 'Photo data required' });
  }
  
  // Check subscription limits
  const subscription = await getUserSubscription(userId);
  const currentPhotos = await convexClient.query(
    api.queries.profile.getCurrentProfilePhotos,
    { user_id: userId }
  );
  
  const limits = getProfileLimits(subscription.plan_type);
  if (currentPhotos.length >= limits.max_photos) {
    return res.status(400).json({ 
      error: `Maximum ${limits.max_photos} photos allowed` 
    });
  }
  
  // Process and upload photo
  try {
    const photoUrl = await uploadPhotoToStorage(photo_base64);
    
    const photoId = await convexClient.mutation(
      api.mutations.profile.addProfilePhoto,
      {
        user_id: userId,
        photo_url: photoUrl,
        is_primary: is_primary || false
      }
    );
    
    res.json({
      success: true,
      photo: {
        photo_id: photoId,
        url: photoUrl,
        is_primary: is_primary || false
      }
    });
  } catch (error) {
    console.error('Photo upload failed:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});
```

### 4.3 Matching API Endpoints

```javascript
// api/matching/swipe.js
app.post('/api/v1/matching/swipe', authenticateToken, async (req, res) => {
  const swiperId = req.user.id;
  const { target_user_id, action } = req.body;
  
  // Validation
  if (!target_user_id || !['like', 'pass'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }
  
  // Prevent self-swiping
  if (swiperId === target_user_id) {
    return res.status(400).json({ error: 'Cannot swipe on yourself' });
  }
  
  // Rate limiting
  const canSwipe = await checkSwipeRateLimit(swiperId);
  if (!canSwipe) {
    return res.status(429).json({ error: 'Swipe limit reached' });
  }
  
  // Check if already swiped
  const existingSwipe = await convexClient.query(
    api.queries.matching.getExistingSwipe,
    { swiper_id: swiperId, swiped_id: target_user_id }
  );
  
  if (existingSwipe) {
    return res.status(400).json({ error: 'Already swiped on this user' });
  }
  
  // Fraud detection
  const isSuspicious = await detectFraudulentSwiping(swiperId, target_user_id);
  if (isSuspicious) {
    return res.status(403).json({ error: 'Suspicious activity detected' });
  }
  
  // Record swipe in Convex
  const result = await convexClient.mutation(
    api.mutations.matching.recordSwipe,
    {
      swiper_id: swiperId,
      swiped_id: target_user_id,
      action
    }
  );
  
  // Business logic for matches
  if (result.is_match) {
    // Send match notifications
    await sendMatchNotifications(result.match_id);
    
    // Award premium features for match
    await awardMatchBonus(swiperId);
    
    // Update user engagement metrics
    await updateUserMetrics(swiperId, 'match_made');
  }
  
  // Update user engagement metrics
  await updateUserMetrics(swiperId, 'swipe_performed');
  
  res.json({
    success: true,
    is_match: result.is_match,
    match_id: result.match_id
  });
});

// api/matching/feed.js
app.get('/api/v1/matching/feed', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;
  
  // Business logic: Check if profile is complete
  const profileComplete = await isUserProfileComplete(userId);
  if (!profileComplete) {
    return res.status(400).json({ 
      error: 'Please complete your profile before browsing' 
    });
  }
  
  // Business logic: Check subscription status for premium features
  const subscription = await getUserSubscription(userId);
  const canAccessFeed = subscription.status === 'active' || 
                       (await hasFreeTrial(userId));
  
  if (!canAccessFeed) {
    return res.status(403).json({ 
      error: 'Subscription required to access discovery feed' 
    });
  }
  
  // Get feed from Convex
  const feed = await convexClient.query(
    api.queries.discovery.getDiscoveryFeed,
    { limit: parseInt(limit), offset: parseInt(offset) }
  );
  
  // Enrich with additional data if needed
  const enrichedFeed = await Promise.all(
    feed.map(async (user) => {
      // Get full photo URLs
      const photos = await convexClient.query(
        api.queries.discovery.getUserDiscoveryDetails,
        { user_id: user.user_id }
      );
      
      return {
        ...user,
        photos: photos?.photos || []
      };
    })
  );
  
  res.json({
    success: true,
    users: enrichedFeed
  });
});
```

### 4.4 Messaging API Endpoints

```javascript
// api/messages/send.js
app.post('/api/v1/messages/send', authenticateToken, async (req, res) => {
  const senderId = req.user.id;
  const { match_id, content, message_type = 'text' } = req.body;
  
  // Validation
  if (!match_id || !content) {
    return res.status(400).json({ error: 'Match ID and content required' });
  }
  
  // Rate limiting
  const canSendMessage = await checkMessageRateLimit(senderId);
  if (!canSendMessage) {
    return res.status(429).json({ error: 'Message limit reached' });
  }
  
  // Content moderation
  const isAppropriate = await moderateContent(content);
  if (!isAppropriate) {
    return res.status(400).json({ error: 'Inappropriate content detected' });
  }
  
  // Check subscription for message limits
  const subscription = await getUserSubscription(senderId);
  const messageCount = await getUserTodayMessageCount(senderId);
  const limits = getMessageLimits(subscription.plan_type);
  
  if (messageCount >= limits.daily_limit) {
    return res.status(403).json({ 
      error: 'Daily message limit reached. Upgrade for unlimited messaging.' 
    });
  }
  
  // Send message via Convex
  try {
    const messageId = await convexClient.mutation(
      api.mutations.messages.sendMessage,
      {
        match_id,
        sender_id: senderId,
        content,
        message_type
      }
    );
    
    // Update user metrics
    await updateUserMetrics(senderId, 'message_sent');
    
    res.json({
      success: true,
      message: {
        message_id: messageId,
        content,
        sent_at: Date.now()
      }
    });
  } catch (error) {
    if (error.message.includes('unauthorized')) {
      return res.status(403).json({ error: 'Not authorized for this conversation' });
    }
    throw error;
  }
});

// api/messages/conversation.js
app.get('/api/v1/messages/conversation/:matchId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { matchId } = req.params;
  const { limit = 50, before } = req.query;
  
  // Verify user has access to conversation
  const match = await convexClient.query(
    api.queries.matches.getMatchById,
    { match_id: matchId }
  );
  
  if (!match) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  // Mark conversation as read
  await convexClient.mutation(
    api.mutations.messages.markConversationAsRead,
    {
      match_id: matchId,
      user_id: userId
    }
  );
  
  // Get messages
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