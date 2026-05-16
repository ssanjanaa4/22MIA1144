# Notification System — Design (Stage 1)

## Overview

This document describes Stage 1 for a simple Campus Notification System microservice. The aim is to provide a small, beginner-friendly REST API to create and read notifications, and a lightweight real-time idea using WebSockets.

---

## Stage 1 — Features

- Simple REST API endpoints
- Create notification
- Get notifications for a student
- Mark notification as read

Notifications are short messages targeted at a student (or group). No persistence requirements are specified for Stage 1; assume an in-memory store or pluggable storage layer later.

### Notification Types

- Placement — messages about job/placement opportunities
- Event — campus events, seminars, workshops
- Result — exam or assessment results

Each notification should carry a small metadata envelope and a `type` field to distinguish behavior or presentation.

Example notification schema (JSON):

```json
{
  "id": "uuid-or-number",
  "studentId": "student-123",
  "type": "Event", // "Placement" | "Event" | "Result"
  "title": "Career Fair",
  "body": "Join the career fair on May 30th, 10:00 AM in Hall A.",
  "createdAt": "2026-05-16T12:00:00Z",
  "read": false,
  "meta": {
    "location": "Hall A",
    "url": "https://campus.example/events/123"
  }
}
```

---

## REST API Endpoints (Stage 1)

Base path: `/api/notifications`

1) Create notification

- Method: `POST`
- Path: `/api/notifications`
- Purpose: Create a new notification for a student

Request example:

```json
POST /api/notifications
Content-Type: application/json

{
  "studentId": "student-123",
  "type": "Placement",
  "title": "New Internship",
  "body": "Internship at Acme Corp — apply by June 1.",
  "meta": { "company": "Acme Corp", "deadline": "2026-06-01" }
}
```

Response example (201 Created):

```json
{
  "id": "notif-001",
  "studentId": "student-123",
  "type": "Placement",
  "title": "New Internship",
  "body": "Internship at Acme Corp — apply by June 1.",
  "createdAt": "2026-05-16T12:05:00Z",
  "read": false,
  "meta": { "company": "Acme Corp", "deadline": "2026-06-01" }
}
```

2) Get notifications for a student

- Method: `GET`
- Path: `/api/notifications?studentId=student-123&unreadOnly=false`
- Purpose: Return all notifications (optionally only unread) for a student

Response example (200 OK):

```json
[
  {
    "id": "notif-001",
    "studentId": "student-123",
    "type": "Placement",
    "title": "New Internship",
    "body": "Internship at Acme Corp — apply by June 1.",
    "createdAt": "2026-05-16T12:05:00Z",
    "read": false,
    "meta": { "company": "Acme Corp", "deadline": "2026-06-01" }
  },
  {
    "id": "notif-002",
    "studentId": "student-123",
    "type": "Event",
    "title": "Workshop",
    "body": "React workshop on May 20.",
    "createdAt": "2026-05-10T09:00:00Z",
    "read": true,
    "meta": { "location": "Lab 5" }
  }
]
```

3) Mark notification as read

- Method: `PATCH` (or `POST`)
- Path: `/api/notifications/:id/read`
- Purpose: Mark a single notification as read

Request example:

```http
PATCH /api/notifications/notif-001/read
```

Response example (200 OK):

```json
{
  "id": "notif-001",
  "read": true
}
```

---

## Simple in-memory behavior (Stage 1)

- Store notifications in a simple in-memory array keyed by `studentId`.
- Keep APIs synchronous/fast. Persisting to DB or external storage is a Stage 2 change.
- Keep IDs simple (UUIDs or incremental numbers).

---

## WebSocket-based real-time notification (simple idea)

Goal: Let a student receive notifications instantly in their browser or mobile app.

How it works (in easy terms):

1. The server runs a WebSocket endpoint (for example `/ws/notifications`).
2. When a student opens the web app, the client connects via WebSocket and identifies itself (e.g., sends `studentId`).
3. The server keeps a small map of connected clients: `Map<studentId, websocketConnection>`.
4. When a new notification is created via the REST API, the server checks the map. If the target student is connected, the server pushes the new notification object over the WebSocket immediately.
5. If the student is not connected, the notification is kept in the usual store and returned on the next `GET` call, or delivered later when the client reconnects (optionally via a push service).

Notes for beginners:
- WebSockets are a persistent TCP-like connection between client and server that allow the server to send messages without a client request.
- Keep the logic small: authenticate the connection (or use a temporary token), validate `studentId` on connect, and handle disconnects by cleaning the map.
- For scale, replace the in-memory connection map with a shared pub/sub (Redis) or a messaging broker and run multiple server instances.

---

## Example flow (real-time)

1. Client connects via WebSocket and sends `{ "studentId": "student-123" }`.
2. Admin or system calls POST `/api/notifications` to create `notif-010` for `student-123`.
3. Server stores the notification and finds an active WebSocket for `student-123`, then sends:

```json
{
  "event": "notification",
  "payload": { "id": "notif-010", "title": "Result Released", "type": "Result", "body": "Your grade is available." }
}
```

4. The client receives and displays it instantly, marking it unread until the user views or the client issues the `PATCH /api/notifications/:id/read` call.

---

## Next steps (Stage 2 ideas)

- Add persistent storage (Postgres, MongoDB).
- Add pagination/filtering for `GET` results.
- Add authentication and authorization.
- Add WebSocket scaling with Redis pub/sub or a message broker.

---

File: `notification_system_design.md`

---

## Stage 2 — Persistence with PostgreSQL

In Stage 2 we add durable storage using PostgreSQL so notifications survive restarts, and we can query/filter them efficiently.

### Why use a SQL database

- Relational guarantees: PostgreSQL provides ACID transactions which help keep notification state consistent when multiple processes write or mark notifications as read.
- Flexible querying: SQL is convenient for filtering, sorting, pagination, and joins (for example joining notifications to student profiles).
- Battle-tested: PostgreSQL scales well for many use cases and has rich indexing, extensions, and tooling.

### Simple table designs

Below are minimal `CREATE TABLE` statements suitable for Stage 2. They omit advanced constraints and migrations for clarity.

```sql
-- Students table: a compact student record referenced by notifications
CREATE TABLE students (
  id UUID PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL, -- application-level id (e.g. "student-123")
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications table: stores notifications per student
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  meta JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE
);
```

Notes:
- `meta` uses `JSONB` so flexible payloads (links, locations, extra fields) fit naturally.
- `student_id` is stored as text to match the application identifier; you can instead use UUID foreign keys if you prefer strict relational IDs.

### Basic indexing

Start with these indexes to support typical queries:

```sql
-- Fetch by student and creation time (for listing most recent notifications)
CREATE INDEX idx_notifications_student_created ON notifications (student_id, created_at DESC);

-- Fetch unread quickly
CREATE INDEX idx_notifications_student_unread ON notifications (student_id) WHERE read = false;

-- If you'll query by type often
CREATE INDEX idx_notifications_type ON notifications (type);
```

Why these help:
- The combined `student_id, created_at` index supports fast ordered retrieval of a student's notifications (pagination & sorting).
- The partial index on `read = false` is small and very fast for fetching only unread notifications.

### How large data can slow queries

- Full table scans: without appropriate indexes, queries that filter by `student_id` or `read` will scan many rows, causing slow responses.
- Index bloat: indexes speed reads but consume space and slow writes; monitor and add only needed indexes.
- Hot partitions: if one student has enormous amounts of notifications, queries and writes for that student can become slower; consider sharding by time or archiving old notifications.
- Joins and JSONB: joining large tables or repeatedly querying deep JSON paths can be slower; use materialized/denormalized columns when necessary.

### Example SQL queries

1) Fetch latest notifications for a student (with optional pagination):

```sql
-- Fetch most recent 20 notifications for student-123
SELECT id, type, title, body, meta, read, created_at, read_at
FROM notifications
WHERE student_id = 'student-123'
ORDER BY created_at DESC
LIMIT 20;
```

2) Fetch only unread notifications:

```sql
SELECT id, type, title, body, meta, created_at
FROM notifications
WHERE student_id = 'student-123' AND read = false
ORDER BY created_at DESC;
```

3) Mark a notification as read (single notification):

```sql
UPDATE notifications
SET read = true, read_at = now()
WHERE id = 'notif-001'
RETURNING id, read, read_at;
```

4) Mark all notifications for a student as read:

```sql
UPDATE notifications
SET read = true, read_at = now()
WHERE student_id = 'student-123' AND read = false;
```

---

## Operational tips

- Use connection pooling (e.g., `pg` + `pg-pool` or an ORM) to avoid opening too many DB connections.
- Monitor slow queries with Postgres `pg_stat_statements` and add indexes selectively.
- Archive or delete old notifications periodically if you expect extremely large volumes.

---

End of Stage 2 notes.
