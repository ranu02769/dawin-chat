# Dawin Chat - Complete Full Stack Application Plan

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Database Schema](#database-schema)
5. [User-Facing Application](#user-facing-application)
6. [Admin Panel](#admin-panel)
7. [Feature Specifications](#feature-specifications)
8. [Deployment Guide](#deployment-guide)
9. [Development Roadmap](#development-roadmap)

---

## 1. Project Overview

**Application Name:** Dawin Chat

**Description:** A real-time chat application similar to WhatsApp and Telegram with random chat features, status sharing, and comprehensive customization options.

**Target Platforms:**
- Web Application (Desktop & Mobile Responsive)
- Android Native Application (via Capacitor)

**Key Characteristics:**
- Real-time messaging
- Random chat feature (Omegle-style)
- Status sharing (24-hour validity)
- Extensive UI customization
- Privacy controls
- Mobile-first design

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite
- **Mobile Wrapper:** Capacitor (for Android app) (MCP already connected, project name Dawin Chat)
- **UI Libraries:**
  - React Router DOM (navigation)
  - Framer Motion (animations)
  - React Icons
  - Emoji Picker React
  - React Hot Toast (notifications)
- **State Management:** Zustand or React Context API
- **Real-time:** Supabase Realtime subscriptions 
- **Styling:** Tailwind CSS with custom theme system

### Backend
- **BaaS:** Supabase
  - PostgreSQL Database
  - Authentication
  - Real-time subscriptions
  - Storage (for images/DPs)
  - Row Level Security (RLS)

### Deployment
- **Web Hosting:** cPanel (with Node.js support)
- **Android:** Google Play Store (APK/AAB via Capacitor)

### Default Color Scheme
- Light Green: `#90EE90`
- Sky Blue: `#87CEEB`
- White: `#FFFFFF`
- Black: `#000000`

---

## 3. Application Architecture

### Folder Structure

```
dawin-chat/
├── public/
│   ├── index.html
│   └── assets/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Avatar.jsx
│   │   │   └── Modal.jsx
│   │   ├── auth/
│   │   │   ├── SignUpStep1.jsx
│   │   │   ├── SignUpStep2.jsx
│   │   │   └── LoginForm.jsx
│   │   ├── chat/
│   │   │   ├── ChatList.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   └── EmojiPicker.jsx
│   │   ├── navigation/
│   │   │   ├── BottomNav.jsx (Mobile)
│   │   │   └── Sidebar.jsx (Desktop)
│   │   ├── status/
│   │   │   ├── StatusList.jsx
│   │   │   ├── StatusViewer.jsx
│   │   │   └── CreateStatus.jsx
│   │   ├── search/
│   │   │   ├── UserSearch.jsx
│   │   │   └── RandomChat.jsx
│   │   └── settings/
│   │       ├── ProfileSettings.jsx
│   │       ├── ThemeCustomization.jsx
│   │       └── PrivacySettings.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Search.jsx
│   │   ├── Status.jsx
│   │   ├── Settings.jsx
│   │   ├── ChatScreen.jsx
│   │   ├── RandomChatScreen.jsx
│   │   └── admin/
│   │       ├── AdminLogin.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── UserManagement.jsx
│   │       └── Analytics.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useChat.js
│   │   ├── useTheme.js
│   │   └── useRealtime.js
│   ├── services/
│   │   ├── supabase.js
│   │   ├── authService.js
│   │   ├── chatService.js
│   │   ├── statusService.js
│   │   └── adminService.js
│   ├── store/
│   │   ├── authStore.js
│   │   ├── chatStore.js
│   │   └── themeStore.js
│   ├── utils/
│   │   ├── dateHelpers.js
│   │   ├── validators.js
│   │   └── constants.js
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   └── main.jsx
├── android/
│   └── (Capacitor generated files)
├── capacitor.config.ts
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env
```

---

## 4. Database Schema

### Supabase Tables

#### 1. `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  dp_url TEXT,
  bio TEXT,
  is_profile_public BOOLEAN DEFAULT true,
  theme_settings JSONB DEFAULT '{}',
  last_username_change TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster searches
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### 2. `chats`
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Ensure user1_id < user2_id for consistency
CREATE INDEX idx_chats_users ON chats(user1_id, user2_id);
```

#### 3. `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'emoji')),
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, created_at DESC);
```

#### 4. `statuses`
```sql
CREATE TABLE statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT CHECK (visibility IN ('chat_list', 'anyone')),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-delete expired statuses (via Supabase function)
CREATE INDEX idx_statuses_expires ON statuses(expires_at);
```

#### 5. `status_views`
```sql
CREATE TABLE status_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status_id UUID REFERENCES statuses(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(status_id, viewer_id)
);
```

#### 6. `random_chat_sessions`
```sql
CREATE TABLE random_chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP
);
```

#### 7. `random_chat_messages`
```sql
CREATE TABLE random_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES random_chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'emoji')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 8. `admins`
```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_super_admin BOOLEAN DEFAULT true
);

-- Only one admin entry should exist (first-time setup)
```

---

## 5. User-Facing Application

### 5.1 Authentication Flow

#### Sign Up Process

**Step 1: Basic Information**
- Full Name (required, min 2 characters)
- Email (required, valid email format)
- Date of Birth (required, must be 13+ years)
- Gender (required: Male/Female/Other)
- Password (required, min 8 characters, 1 uppercase, 1 number)
- Confirm Password (must match)

**Validation Rules:**
```javascript
const validateStep1 = {
  fullName: (val) => val.length >= 2,
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  dateOfBirth: (val) => {
    const age = (new Date() - new Date(val)) / 31557600000;
    return age >= 13;
  },
  password: (val) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(val)
};
```

**Step 2: Username Selection**
- Username (required, 3-20 characters, alphanumeric + underscore)
- Check availability in real-time
- Auto-suggest available usernames if taken

```javascript
const checkUsernameAvailability = async (username) => {
  const { data } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .single();
  return !data;
};
```

**Post Sign Up:**
- Redirect to Home screen
- Show welcome toast notification

#### Sign In Process
- Email + Password
- Remember me option
- Forgot password flow (email reset link)

### 5.2 Navigation System

#### Mobile (< 768px)
- **Bottom Navigation Bar** (fixed position)
  - Home (chat list icon)
  - Search (magnifying glass)
  - Status (circle/story icon)
  - Settings (gear icon)

#### Desktop (≥ 768px)
- **Sidebar Navigation** (left side, collapsible)
  - User profile section (top)
  - Navigation items
  - Logout button (bottom)

**Implementation:**
```jsx
// Responsive Navigation Component
const Navigation = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return isMobile ? <BottomNav /> : <Sidebar />;
};
```

### 5.3 Core Features

#### HOME SECTION

**Layout:**
```
┌─────────────────────────────┐
│  🔍 Search chats/users...   │
├─────────────────────────────┤
│  👤 User 1         12:30 PM │
│  Last message preview...    │
├─────────────────────────────┤
│  👤 User 2         Yesterday│
│  Last message preview...    │
└─────────────────────────────┘
```

**Features:**
- Search bar for filtering chats and searching usernames
- Chat list (sorted by last message timestamp)
- Each chat item shows:
  - User DP
  - Username
  - Last message preview (truncated to 30 chars)
  - Timestamp
  - Unread message count badge
- Click to open chat

**Chat Window:**
```
┌─────────────────────────────┐
│ ← @username            ⋮    │
├─────────────────────────────┤
│                             │
│  [Them] Hey! How are you?   │
│                             │
│          [You] I'm good! ⭐ │
│                             │
├─────────────────────────────┤
│ 😊 | 📷 | Type message...   │
└─────────────────────────────┘
```

**Supported Message Types:**
1. **Text Messages**
   - Plain text
   - Max 5000 characters
   - Link detection and preview

2. **Images**
   - Upload from gallery/camera (Capacitor)
   - Max 5MB per image
   - Compress before upload
   - Store in Supabase Storage
   - Display with lightbox on click

3. **Emojis**
   - Emoji picker component
   - Recent emojis section
   - Search emojis

**Real-time Implementation:**
```javascript
// Subscribe to new messages
useEffect(() => {
  const subscription = supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    }, (payload) => {
      setMessages(prev => [...prev, payload.new]);
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [chatId]);
```

#### SEARCH SECTION

**Layout:**
```
┌─────────────────────────────┐
│  🎲 Random Chat             │ <- Special button
├─────────────────────────────┤
│  🔍 Search username...      │
├─────────────────────────────┤
│  Results:                   │
│  👤 @user123                │
│  👤 @another_user           │
└─────────────────────────────┘
```

**User Search:**
- Search by username
- Real-time search results
- Display based on privacy settings:
  - **Public profiles:** DP, Name, Username, Bio
  - **Private profiles:** DP, Name, Username only
- Click to start chat

**Random Chat Feature:**

**Flow:**
1. User clicks "Random Chat" button
2. New screen opens with loading state
3. System finds another available user
4. Match users in `random_chat_sessions` table
5. Show connection success message

**Screen Layout:**
```
┌─────────────────────────────┐
│ Random Chat                 │
│ Connected: @randomuser      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                             │
│ [System] Connected success- │
│ fully. Now chat!            │
│                             │
│  [Them] Hi there!           │
│                             │
│           [You] Hello! 👋   │
│                             │
├─────────────────────────────┤
│ 😊 | Type message... | ⛔   │
│                     Disconnect
└─────────────────────────────┘
```

**Features:**
- Text and emoji support only
- Both usernames visible
- System message on connection
- Disconnect button (either user can disconnect)
- On disconnect, session marked inactive
- Auto-disconnect after 30 minutes of inactivity

**Matching Algorithm:**
```javascript
const findRandomChatPartner = async (userId) => {
  // Find users not currently in active sessions
  const { data: activeUsers } = await supabase
    .from('random_chat_sessions')
    .select('user1_id, user2_id')
    .eq('is_active', true);
  
  const busyUserIds = activeUsers.flatMap(s => [s.user1_id, s.user2_id]);
  
  // Get random available user
  const { data: partner } = await supabase
    .from('users')
    .select('id, username')
    .not('id', 'in', `(${busyUserIds.join(',')})`)
    .neq('id', userId)
    .limit(1)
    .single();
  
  return partner;
};
```

#### STATUS SECTION

**Layout:**
```
┌─────────────────────────────┐
│  + Add Status               │
├─────────────────────────────┤
│  My Status                  │
│  📝 "Feeling great!" (2h)   │
├─────────────────────────────┤
│  Recent Updates             │
│  👤 @user1 (5h ago)         │
│  👤 @user2 (12h ago)        │
└─────────────────────────────┘
```

**Create Status:**
- Text and emojis only
- Max 250 characters
- Visibility options:
  1. **Chat List Only:** Visible to users in your chat list
  2. **Anyone:** Visible to all app users

**Status Visibility Logic:**
```javascript
const getVisibleStatuses = async (userId) => {
  // Get user's chat partners
  const { data: chatPartners } = await supabase
    .from('chats')
    .select('user1_id, user2_id')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  
  const partnerIds = chatPartners.map(chat => 
    chat.user1_id === userId ? chat.user2_id : chat.user1_id
  );
  
  // Get statuses
  const { data: statuses } = await supabase
    .from('statuses')
    .select('*, user:users(*)')
    .gt('expires_at', new Date().toISOString())
    .or(`visibility.eq.anyone,and(visibility.eq.chat_list,user_id.in.(${partnerIds.join(',')}))`);
  
  return statuses;
};
```

**Status Features:**
- 24-hour expiry (auto-delete via Supabase function)
- View count tracking
- Tap to view full screen
- Delete own status
- Progress bar showing time remaining

**Auto-Delete Function:**
```sql
-- Supabase Edge Function or pg_cron
CREATE OR REPLACE FUNCTION delete_expired_statuses()
RETURNS void AS $$
BEGIN
  DELETE FROM statuses WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule to run every hour
SELECT cron.schedule('delete-expired-statuses', '0 * * * *', 'SELECT delete_expired_statuses()');
```

#### SETTINGS SECTION

**Profile Settings:**

**Editable Fields:**
1. **Display Picture (DP)**
   - Upload new image
   - Crop/resize option
   - Max 2MB
   - Store in Supabase Storage bucket `avatars`

2. **Name**
   - Change full name anytime
   - Min 2 characters

3. **Username**
   - **Restriction:** Can only change once every 7 days
   - Check availability
   - Show last change date
   - Countdown to next available change

**Username Change Logic:**
```javascript
const canChangeUsername = (lastChange) => {
  if (!lastChange) return true;
  const daysSinceChange = (Date.now() - new Date(lastChange)) / 86400000;
  return daysSinceChange >= 7;
};

const getRemainingDays = (lastChange) => {
  const daysSinceChange = (Date.now() - new Date(lastChange)) / 86400000;
  return Math.max(0, Math.ceil(7 - daysSinceChange));
};
```

**Theme & UI Customization:**

**Color Theme Customization:**
```
┌─────────────────────────────┐
│  Primary Color:   🟢         │
│  [Color Picker]             │
├─────────────────────────────┤
│  Secondary Color: 🔵         │
│  [Color Picker]             │
├─────────────────────────────┤
│  Accent Color:    ⚫         │
│  [Color Picker]             │
├─────────────────────────────┤
│  Preset Themes:             │
│  [Default] [Ocean] [Sunset] │
└─────────────────────────────┘
```

**Available Customizations:**
1. **Color Schemes:**
   - Primary color (default: light green)
   - Secondary color (default: sky blue)
   - Accent color
   - Background colors
   - Text colors
   - Preset themes

2. **Style Options:**
   - Dark Mode / Light Mode toggle
   - Chat bubble style (rounded, square, etc.)
   - Font size (small, medium, large)
   - Message density (compact, comfortable, spacious)

3. **Interface:**
   - Show/hide online status
   - Show/hide typing indicators
   - Notification sounds toggle
   - Vibration toggle

**Theme Storage:**
```javascript
// Store in user's theme_settings JSONB column
const themeSettings = {
  mode: 'dark', // or 'light'
  colors: {
    primary: '#90EE90',
    secondary: '#87CEEB',
    accent: '#000000',
    background: '#FFFFFF'
  },
  fontSize: 'medium',
  bubbleStyle: 'rounded',
  density: 'comfortable'
};

// Apply theme
const applyTheme = (settings) => {
  document.documentElement.style.setProperty('--primary', settings.colors.primary);
  document.documentElement.style.setProperty('--secondary', settings.colors.secondary);
  // ... etc
};
```

**Privacy Settings:**

**Profile Visibility:**
```
┌─────────────────────────────┐
│  Profile Visibility         │
│  ○ Public                   │
│  ● Private                  │
├─────────────────────────────┤
│  Public Profile shows:      │
│  • Display Picture          │
│  • Name                     │
│  • Username                 │
│  • Bio                      │
│                             │
│  Private Profile shows:     │
│  • Display Picture          │
│  • Name                     │
│  • Username                 │
└─────────────────────────────┘
```

**Privacy Options:**
- **Public Profile:**
  - All profile details visible in search
  - Anyone can view status
  - Anyone can initiate chat

- **Private Profile:**
  - Only DP, name, username visible
  - Bio hidden
  - Status visible per visibility settings
  - Anyone can still initiate chat

**Additional Settings:**
- Account deletion
- Data export
- Blocked users list
- Logout

---

## 6. Admin Panel

### 6.1 Access & Security

**URL:** `https://yourdomain.com/123456/admin`

**Security Measures:**
1. Obscured URL path (`/123456/admin`)
2. Separate authentication from main app
3. Session timeout (30 minutes)
4. IP whitelist (optional, via .htaccess)
5. Rate limiting on login attempts

**First-Time Setup:**
```jsx
// AdminSetup.jsx - Only shows if no admin exists
const AdminSetup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSetup = async () => {
    // Check if admin exists
    const { count } = await supabase
      .from('admins')
      .select('*', { count: 'exact' });
    
    if (count > 0) {
      return alert('Admin already exists');
    }

    // Hash password and create admin
    const passwordHash = await bcrypt.hash(formData.password, 10);
    await supabase.from('admins').insert({
      email: formData.email,
      password_hash: passwordHash
    });
  };
};
```

**Authentication:**
- Email and password (set during first-time setup)
- Credentials cannot be changed from UI (security)
- To reset: Direct database access required

### 6.2 Admin Features

#### Dashboard

**Layout:**
```
┌────────────────────────────────────────┐
│  Dawin Chat Admin Panel                │
├────────────────────────────────────────┤
│  📊 Analytics    👥 Users    ⚙️ Status │
├────────────────────────────────────────┤
│                                        │
│  Key Metrics:                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 1,234││ 5,678││  89  ││  45  │ │
│  │ Users││ Msgs ││Active││Status│ │
│  └──────┘ └──────┘ └──────┘ └──────┘ │
│                                        │
│  Recent Activity:                      │
│  • New user: @john_doe (2m ago)        │
│  • New chat started (5m ago)           │
│                                        │
└────────────────────────────────────────┘
```

**Analytics Dashboard:**

**Metrics to Display:**
1. **User Statistics:**
   - Total users
   - Active users (last 7 days)
   - New users (last 30 days)
   - User growth chart

2. **Messaging Statistics:**
   - Total messages sent
   - Messages today
   - Most active users
   - Peak usage times

3. **Status Statistics:**
   - Active statuses
   - Total status views
   - Most viewed statuses

4. **Random Chat Statistics:**
   - Total sessions
   - Active sessions
   - Average session duration

**Charts:**
- User registration trend (line chart)
- Message volume (bar chart)
- Active users by hour (heatmap)

**Implementation:**
```javascript
const getAnalytics = async () => {
  // Total users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact' });

  // Active users (last 7 days)
  const { count: activeUsers } = await supabase
    .from('messages')
    .select('sender_id', { count: 'exact' })
    .gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());

  // Total messages
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact' });

  return { totalUsers, activeUsers, totalMessages };
};
```

#### User Management

**User List:**
```
┌────────────────────────────────────────────────┐
│  Search: [_____________] 🔍                    │
├────────────────────────────────────────────────┤
│  Username    Name         Email        Actions │
├────────────────────────────────────────────────┤
│  @john_doe   John Doe     john@...    [✏️] [🗑️]│
│  @jane_user  Jane Smith   jane@...    [✏️] [🗑️]│
│  @alice_123  Alice Wong   alice@...   [✏️] [🗑️]│
└────────────────────────────────────────────────┘
```

**Features:**
1. **View All Users:**
   - Paginated list (50 per page)
   - Search by username/email/name
   - Sort by: join date, username, activity

2. **Edit User:**
   - Modal/form to edit:
     - Full name
     - Email
     - Username
     - Account status (active/suspended)
     - Profile visibility
   - View user's:
     - Total messages sent
     - Join date
     - Last active
     - Chat count

3. **Delete User:**
   - Confirmation modal
   - Cascade delete:
     - All messages
     - All statuses
     - All chats
     - Profile picture
   - Soft delete option (mark as deleted but keep data)

**Edit User Modal:**
```jsx
const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    email: user.email,
    username: user.username,
    is_active: user.is_active
  });

  const handleSave = async () => {
    await supabase
      .from('users')
      .update(formData)
      .eq('id', user.id);
    onSave();
  };

  return (
    <Modal>
      <h2>Edit User</h2>
      <Input label="Full Name" value={formData.full_name} onChange={...} />
      <Input label="Email" value={formData.email} onChange={...} />
      <Input label="Username" value={formData.username} onChange={...} />
      <Toggle label="Active" checked={formData.is_active} onChange={...} />
      <Button onClick={handleSave}>Save</Button>
    </Modal>
  );
};
```

#### Status Management

**View All Statuses:**
```
┌────────────────────────────────────────────┐
│  Active Statuses                           │
├────────────────────────────────────────────┤
│  @john_doe                                 │
│  "Having a great day! 🌞"                  │
│  Expires in: 14h 32m | Views: 23   [🗑️]   │
├────────────────────────────────────────────┤
│  @jane_user                                │
│  "Working on new project 💻"               │
│  Expires in: 3h 15m | Views: 8     [🗑️]   │
└────────────────────────────────────────────┘
```

**Features:**
- View all active statuses
- Filter by user
- See view count
- Delete inappropriate statuses
- View status details (who viewed, when)

### 6.3 Admin UI Design

**Design Principles:**
- **Minimalist:** Basic HTML tables, simple forms
- **Functional:** Focus on data display and CRUD operations
- **Responsive:** Works on desktop (primary) and tablet
- **No fancy animations:** Keep it simple and fast

**Technology:**
- Simple React components
- Basic Tailwind utility classes
- No complex state management
- Direct Supabase queries

**Color Scheme:**
- Background: White (#FFFFFF)
- Text: Black (#000000)
- Headers: Sky Blue (#87CEEB)
- Buttons: Light Green (#90EE90)
- Borders: Light gray (#E5E7EB)

---

## 7. Feature Specifications

### 7.1 Real-time Features

**Implementation using Supabase Realtime:**

```javascript
// Real-time message subscription
const subscribeToChat = (chatId, callback) => {
  return supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    }, callback)
    .subscribe();
};

// Real-time status updates
const subscribeToStatuses = (callback) => {
  return supabase
    .channel('statuses')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'statuses'
    }, callback)
    .subscribe();
};

// Online status tracking
const updateOnlineStatus = async (userId, isOnline) => {
  await supabase
    .from('users')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId);
};
```

### 7.2 File Upload & Storage

**Supabase Storage Buckets:**

1. **avatars** (public)
   - User profile pictures
   - Max 2MB per file
   - Formats: JPG, PNG, WebP

2. **chat-images** (private with RLS)
   - Chat images
   - Max 5MB per file
   - Formats: JPG, PNG, WebP, GIF

**Upload Function:**
```javascript
const uploadImage = async (file, bucket, userId) => {
  // Compress image
  const compressedFile = await compressImage(file, {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8
  });

  // Generate unique filename
  const fileName = `${userId}-${Date.now()}.${file.type.split('/')[1]}`;

  // Upload
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, compressedFile);

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
};
```

### 7.3 Notification System

**Push Notifications (via Capacitor):**

```javascript
// Request permission
const requestNotificationPermission = async () => {
  const { receive } = await PushNotifications.requestPermissions();
  if (receive === 'granted') {
    await PushNotifications.register();
  }
};

// Handle new message notification
const sendNotification = async (userId, message) => {
  // Via Supabase Edge Function or Firebase Cloud Messaging
  await fetch('/api/send-notification', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      title: message.sender.username,
      body: message.content,
      data: { chatId: message.chat_id }
    })
  });
};
```

### 7.4 Search & Discovery

**User Search Implementation:**
```javascript
const searchUsers = async (query, currentUserId) => {
  const { data } = await supabase
    .from('users')
    .select('id, username, full_name, dp_url, is_profile_public, bio')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .neq('id', currentUserId)
    .limit(20);

  // Filter based on privacy
  return data.map(user => ({
    ...user,
    bio: user.is_profile_public ? user.bio : null
  }));
};
```

**Chat Search:**
```javascript
const searchChats = async (query, userId) => {
  // Search in messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*, chat:chats(*)')
    .ilike('content', `%${query}%`)
    .or(`chat.user1_id.eq.${userId},chat.user2_id.eq.${userId}`);

  // Get unique chats
  const chatIds = [...new Set(messages.map(m => m.chat_id))];
  return chatIds;
};
```

---

## 8. Deployment Guide

### 8.1 Supabase Setup

**Step 1: Create Project**
1. Go to https://supabase.com
2. Create new project
3. Note down:
   - Project URL
   - Anon/Public Key
   - Service Role Key (for admin operations)

**Step 2: Database Setup**
1. Run all table creation SQL scripts (from Section 4)
2. Set up Row Level Security (RLS) policies:

```sql
-- Users can read all public profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON users FOR SELECT
USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Users can read their own messages
CREATE POLICY "Users can read own messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
  )
);

-- Users can insert messages in their chats
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (sender_id = auth.uid());
```

**Step 3: Storage Setup**
1. Create buckets: `avatars` (public), `chat-images` (private)
2. Set up storage policies:

```sql
-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

**Step 4: Edge Functions (Optional)**
- Set up cron job for deleting expired statuses
- Notification service

### 8.2 Frontend Build & Deploy

**Step 1: Configure Environment**

Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_NAME=Dawin Chat
VITE_ADMIN_PATH=123456
```

**Step 2: Build Web App**
```bash
npm install
npm run build
```

**Step 3: Deploy to cPanel**

1. **Upload Files:**
   - Upload `dist` folder contents to `public_html/`
   - Or subdomain/subdirectory

2. **Configure .htaccess** (for SPA routing):
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Optional: Restrict admin panel by IP
<Location "/123456/admin">
  Order Deny,Allow
  Deny from all
  Allow from YOUR_IP_ADDRESS
</Location>
```

3. **Set up SSL** (Let's Encrypt via cPanel)

### 8.3 Android App Build

**Step 1: Configure Capacitor**

`capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dawinchat.app',
  appName: 'Dawin Chat',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#87CEEB",
      showSpinner: false
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#87CEEB'
    }
  }
};

export default config;
```

**Step 2: Add Android Platform**
```bash
npm install @capacitor/android
npx cap add android
```

**Step 3: Configure Android Settings**

`android/app/src/main/res/values/styles.xml`:
```xml
<resources>
  <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <!-- DON'T use fullscreen mode -->
    <item name="android:windowFullscreen">false</item>
    <!-- Show status bar -->
    <item name="android:windowTranslucentStatus">false</item>
  </style>
</resources>
```

`android/app/src/main/AndroidManifest.xml`:
```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:theme="@style/AppTheme">
    
    <activity
        android:name=".MainActivity"
        android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
        android:label="@string/app_name"
        android:launchMode="singleTask"
        android:theme="@style/AppTheme"
        android:windowSoftInputMode="adjustResize">
        
        <!-- Ensure app doesn't go fullscreen -->
        <meta-data
            android:name="android.max_aspect"
            android:value="2.1" />
    </activity>
</application>
```

**Step 4: Add Required Permissions**

In `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.VIBRATE" />
```

**Step 5: Build APK**
```bash
npm run build
npx cap sync
npx cap open android
```

In Android Studio:
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- Or Build → Generate Signed Bundle / APK (for Play Store)

**Step 6: Test on Device**
```bash
npx cap run android
```

---

## 9. Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up development environment
- [ ] Initialize React + Vite project
- [ ] Configure Tailwind CSS
- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Implement authentication system
- [ ] Build basic routing

### Phase 2: Core Features (Weeks 3-5)
- [ ] Implement Home/Chat List
- [ ] Build Chat Window with real-time messaging
- [ ] Add image upload functionality
- [ ] Implement emoji picker
- [ ] Create user search functionality
- [ ] Build navigation system (mobile + desktop)

### Phase 3: Advanced Features (Weeks 6-7)
- [ ] Implement Status feature
- [ ] Build Random Chat functionality
- [ ] Add Settings pages
- [ ] Implement theme customization
- [ ] Add privacy controls
- [ ] Username change restriction logic

### Phase 4: Admin Panel (Week 8)
- [ ] Create admin authentication
- [ ] Build analytics dashboard
- [ ] Implement user management
- [ ] Add status management
- [ ] Test all admin features

### Phase 5: Mobile Optimization (Week 9)
- [ ] Add Capacitor
- [ ] Configure Android platform
- [ ] Implement native features (camera, file picker)
- [ ] Test responsive design
- [ ] Fix fullscreen issue
- [ ] Add push notifications

### Phase 6: Testing & Deployment (Week 10)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Build production version
- [ ] Deploy web app to cPanel
- [ ] Build Android APK
- [ ] Create user documentation

### Phase 7: Launch & Iteration (Week 11+)
- [ ] Soft launch
- [ ] Gather user feedback
- [ ] Fix bugs
- [ ] Add requested features
- [ ] Monitor analytics
- [ ] Plan v2 features

---

## 10. Technical Considerations

### Performance Optimization

**Image Optimization:**
```javascript
const compressImage = (file, options) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions
        let { width, height } = img;
        if (width > options.maxWidth) {
          height = (height * options.maxWidth) / width;
          width = options.maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          options.quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};
```

**Lazy Loading:**
```javascript
// Lazy load chat messages
const loadMessages = async (chatId, offset = 0, limit = 50) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  return data.reverse();
};

// Infinite scroll implementation
const useInfiniteScroll = (loadMore) => {
  const containerRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 1.0 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [loadMore]);
  
  return containerRef;
};
```

**Caching Strategy:**
```javascript
// Cache user profiles
const userCache = new Map();

const getUserProfile = async (userId) => {
  if (userCache.has(userId)) {
    return userCache.get(userId);
  }
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  userCache.set(userId, data);
  return data;
};
```

### Security Best Practices

**Input Validation:**
```javascript
const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 5000); // Limit length
};

const validateMessage = (message) => {
  if (!message || typeof message !== 'string') return false;
  if (message.length > 5000) return false;
  return true;
};
```

**Rate Limiting:**
```javascript
// Client-side rate limiting
const rateLimiter = {
  messages: new Map(),
  
  canSend(userId) {
    const now = Date.now();
    const userMessages = this.messages.get(userId) || [];
    
    // Filter messages from last minute
    const recentMessages = userMessages.filter(t => now - t < 60000);
    
    if (recentMessages.length >= 30) {
      return false; // Max 30 messages per minute
    }
    
    recentMessages.push(now);
    this.messages.set(userId, recentMessages);
    return true;
  }
};
```

**XSS Prevention:**
```javascript
// Use React's built-in XSS protection
// Never use dangerouslySetInnerHTML with user content

// For links, validate URLs
const validateURL = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

### Responsive Design

**Breakpoints:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px'
    }
  }
};
```

**Mobile-First Approach:**
```jsx
// Component example
const ChatWindow = () => {
  return (
    <div className="
      flex flex-col h-screen
      md:max-w-4xl md:mx-auto
      lg:max-w-6xl
    ">
      <ChatHeader className="
        h-14 px-4
        md:h-16 md:px-6
      " />
      <MessageList className="
        flex-1 overflow-y-auto p-4
        md:p-6
      " />
      <MessageInput className="
        h-16 px-4
        md:h-20 md:px-6
      " />
    </div>
  );
};
```

### Error Handling

**Global Error Boundary:**
```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**API Error Handling:**
```javascript
const handleSupabaseError = (error) => {
  if (error.code === 'PGRST116') {
    return 'No data found';
  }
  if (error.code === '23505') {
    return 'This already exists';
  }
  return 'An error occurred. Please try again.';
};

const safeQuery = async (queryFn) => {
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(error);
    return { data: null, error: handleSupabaseError(error) };
  }
};
```

---

## 11. Future Enhancements (Post-Launch)

### Phase 2 Features
- Voice messages
- Video messages
- Voice/video calls
- Group chats
- Broadcast channels
- Message reactions
- Message forwarding
- Polls
- Location sharing
- Contact sharing

### Additional Customization
- Chat wallpapers
- Custom notification sounds
- Chat-specific themes
- Message bubble customization
- Font selection

### Advanced Features
- End-to-end encryption
- Self-destructing messages
- Scheduled messages
- Message translation
- Bot API
- Web hooks
- Public channels

### Admin Enhancements
- Advanced analytics
- User reports/moderation
- Content filtering
- Automated bans
- Backup/restore
- Export data

---

## Conclusion

This comprehensive plan provides a complete roadmap for building Dawin Chat from scratch. The application will be:

✅ **User-Friendly:** Intuitive interface similar to popular chat apps
✅ **Feature-Rich:** Core messaging + unique features like random chat
✅ **Customizable:** Extensive theme and UI options
✅ **Scalable:** Built on Supabase with proper architecture
✅ **Cross-Platform:** Web + Android native app
✅ **Secure:** RLS policies, input validation, rate limiting
✅ **Maintainable:** Clean code structure, well-documented

**Next Steps:**
1. Set up Supabase project
2. Initialize React + Vite project
3. Follow the development roadmap
4. Test thoroughly before launch
5. Deploy and iterate based on feedback

Good luck with your Dawin Chat project! 🚀
