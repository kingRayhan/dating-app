// drizzle/schema.ts
import { pgTable, pgEnum as enum_, serial, uuid, varchar, text, integer, boolean, timestamp, jsonb, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const genderEnum = enum_('gender', ['male', 'female', 'non_binary', 'other']);
export const swipeActionEnum = enum_('swipe_action', ['like', 'pass']);
export const matchStatusEnum = enum_('match_status', ['active', 'inactive']);
export const subscriptionStatusEnum = enum_('subscription_status', ['active', 'cancelled', 'expired']);
export const reportReasonEnum = enum_('report_reason', [
  'inappropriate_content',
  'harassment',
  'fake_profile',
  'scam',
  'other'
]);
export const notificationTypeEnum = enum_('notification_type', [
  'new_match',
  'new_message',
  'profile_view',
  'subscription_expired',
  'super_like'
]);

// Interest Categories
export const interestCategories = pgTable('interest_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_interest_categories_name').on(table.name),
}));

// Interests
export const interests = pgTable('interests', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => interestCategories.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  popularityScore: integer('popularity_score').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('idx_interests_category').on(table.categoryId),
  nameUniqueIdx: uniqueIndex('idx_interests_category_name').on(table.categoryId, table.name),
}));

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  otpHash: varchar('otp_hash', { length: 255 }),
  otpExpiresAt: timestamp('otp_expires_at'),
  isVerified: boolean('is_verified').default(false).notNull(),
  lastLogin: timestamp('last_login'),
  
  // Profile data
  firstName: varchar('first_name', { length: 50 }),
  lastName: varchar('last_name', { length: 50 }),
  birthDate: timestamp('birth_date'),
  gender: genderEnum('gender'),
  bio: text('bio'),
  location: varchar('location'), // Will store as "lat,long" string or use PostGIS
  locationName: varchar('location_name', { length: 100 }),
  maxDistance: integer('max_distance').default(50),
  ageMin: integer('age_min').default(18),
  ageMax: integer('age_max').default(100),
  showMe: varchar('show_me', { length: 20 }).default('everyone'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  phoneIdx: index('idx_users_phone').on(table.phoneNumber),
  verifiedIdx: index('idx_users_verified').on(table.isVerified),
  locationIdx: index('idx_users_location').on(table.location),
  createdAtIdx: index('idx_users_created_at').on(table.createdAt),
}));

// Profile Photos
export const profilePhotos = pgTable('profile_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  photoUrl: varchar('photo_url', { length: 500 }).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_photos_user').on(table.userId),
  primaryIdx: index('idx_photos_primary').on(table.userId, table.isPrimary),
}));

// User Interests (Many-to-Many)
export const userInterests = pgTable('user_interests', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  interestId: integer('interest_id').references(() => interests.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey(table.userId, table.interestId),
  userIdx: index('idx_user_interests_user').on(table.userId),
  interestIdx: index('idx_user_interests_interest').on(table.interestId),
}));

// Swipes
export const swipes = pgTable('swipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  swiperId: uuid('swiper_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  swipedId: uuid('swiped_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: swipeActionEnum('action').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSwipe: uniqueIndex('idx_swipes_unique').on(table.swiperId, table.swipedId),
  swiperIdx: index('idx_swipes_swiper').on(table.swiperId),
  swipedIdx: index('idx_swipes_swiped').on(table.swipedId),
  createdAtIdx: index('idx_swipes_created_at').on(table.createdAt),
}));

// Matches
export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  user1Id: uuid('user1_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  user2Id: uuid('user2_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  matchedAt: timestamp('matched_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueMatch: uniqueIndex('idx_matches_unique').on(table.user1Id, table.user2Id),
  user1Idx: index('idx_matches_user1').on(table.user1Id),
  user2Idx: index('idx_matches_user2').on(table.user2Id),
  activeIdx: index('idx_matches_active').on(table.isActive),
  matchedAtIdx: index('idx_matches_matched_at').on(table.matchedAt),
}));

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 20 }).default('text').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
}, (table) => ({
  matchIdx: index('idx_messages_match').on(table.matchId),
  senderIdx: index('idx_messages_sender').on(table.senderId),
  unreadIdx: index('idx_messages_unread').on(table.matchId, table.isRead),
  sentAtIdx: index('idx_messages_sent_at').on(table.sentAt),
}));

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planType: varchar('plan_type', { length: 50 }).notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_subscriptions_user').on(table.userId),
  statusIdx: index('idx_subscriptions_status').on(table.status),
  expiryIdx: index('idx_subscriptions_expiry').on(table.expiresAt),
}));

// Reports
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reportedUserId: uuid('reported_user_id').references(() => users.id, { onDelete: 'cascade' ).notNull(),
  reason: reportReasonEnum('reason').notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  reporterIdx: index('idx_reports_reporter').on(table.reporterId),
  reportedIdx: index('idx_reports_reported').on(table.reportedUserId),
  statusIdx: index('idx_reports_status').on(table.status),
}));

// User Blocks
export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  blockerId: uuid('blocker_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  blockedId: uuid('blocked_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueBlock: uniqueIndex('idx_blocks_unique').on(table.blockerId, table.blockedId),
  blockerIdx: index('idx_blocks_blocker').on(table.blockerId),
  blockedIdx: index('idx_blocks_blocked').on(table.blockedId),
}));

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: notificationTypeEnum('type').notNull(),
  relatedId: varchar('related_id', { length: 100 }),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  unreadIdx: index('idx_notifications_unread').on(table.userId, table.isRead),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
}));

// RELATIONS

// Users relations
export const usersRelations = relations(users, ({ many }) => ({
  profilePhotos: many(profilePhotos),
  userInterests: many(userInterests),
  sentSwipes: many(swipes, { relationName: 'swiper' }),
  receivedSwipes: many(swipes, { relationName: 'swiped' }),
  matchesAsUser1: many(matches, { relationName: 'user1' }),
  matchesAsUser2: many(matches, { relationName: 'user2' }),
  sentMessages: many(messages, { relationName: 'sender' }),
  subscriptions: many(subscriptions),
  reportsMade: many(reports, { relationName: 'reporter' }),
  reportsReceived: many(reports, { relationName: 'reported' }),
  blocksMade: many(userBlocks, { relationName: 'blocker' }),
  blocksReceived: many(userBlocks, { relationName: 'blocked' }),
  notifications: many(notifications),
}));

// Profile Photos relations
export const profilePhotosRelations = relations(profilePhotos, ({ one }) => ({
  user: one(users, {
    fields: [profilePhotos.userId],
    references: [users.id],
  }),
}));

// Interests relations
export const interestsRelations = relations(interests, ({ one, many }) => ({
  category: one(interestCategories, {
    fields: [interests.categoryId],
    references: [interestCategories.id],
  }),
  userInterests: many(userInterests),
}));

// Interest Categories relations
export const interestCategoriesRelations = relations(interestCategories, ({ many }) => ({
  interests: many(interests),
}));

// User Interests relations
export const userInterestsRelations = relations(userInterests, ({ one }) => ({
  user: one(users, {
    fields: [userInterests.userId],
    references: [users.id],
  }),
  interest: one(interests, {
    fields: [userInterests.interestId],
    references: [interests.id],
  }),
}));

// Swipes relations
export const swipesRelations = relations(swipes, ({ one }) => ({
  swiper: one(users, {
    fields: [swipes.swiperId],
    references: [users.id],
    relationName: 'swiper',
  }),
  swiped: one(users, {
    fields: [swipes.swipedId],
    references: [users.id],
    relationName: 'swiped',
  }),
}));

// Matches relations
export const matchesRelations = relations(matches, ({ one, many }) => ({
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
    relationName: 'user1',
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
    relationName: 'user2',
  }),
  messages: many(messages),
}));

// Messages relations
export const messagesRelations = relations(messages, ({ one }) => ({
  match: one(matches, {
    fields: [messages.matchId],
    references: [matches.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
}));

// Subscriptions relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// Reports relations
export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  reportedUser: one(users, {
    fields: [reports.reportedUserId],
    references: [users.id],
    relationName: 'reported',
  }),
}));

// User Blocks relations
export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(users, {
    fields: [userBlocks.blockerId],
    references: [users.id],
    relationName: 'blocker',
  }),
  blocked: one(users, {
    fields: [userBlocks.blockedId],
    references: [users.id],
    relationName: 'blocked',
  }),
}));

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Export all tables
export const schema = {
  users,
  profilePhotos,
  interestCategories,
  interests,
  userInterests,
  swipes,
  matches,
  messages,
  subscriptions,
  reports,
  userBlocks,
  notifications,
  // Enums
  genderEnum,
  swipeActionEnum,
  matchStatusEnum,
  subscriptionStatusEnum,
  reportReasonEnum,
  notificationTypeEnum,
};