# HabitNest — Bot specification

**Archetype:** workflow

**Voice:** encouraging and non-judgmental — write every user-facing message, button label, error, and empty state in this voice.

Private habit tracker with gentle reminders, one-tap check-ins, streak tracking, milestone celebrations, and weekly recaps. Encouraging tone with no social sharing.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual users seeking habit formation

## Success criteria

- User maintains 70%+ completion rate for 30 days
- Weekly recap viewed by 80% of active users

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open onboarding flow or main menu
- **Create new habit** (button, actor: user, callback: habit:create) — Start habit creation wizard
- **My habits** (button, actor: user, callback: habits:list) — View all active habits with metrics
- **/remind** (command, actor: user, command: /remind) — Manually trigger reminder for current day

## Flows

### Onboarding
_Trigger:_ /start

1. Detect timezone from Telegram metadata
2. Collect preferred reminder time
3. Show habit creation tutorial

_Data touched:_ User

### Daily check-in
_Trigger:_ Scheduled reminder

1. Send reminder at scheduled local time
2. Show Done/Skip/Snooze buttons
3. Update streak metrics

_Data touched:_ Instance, Metrics

### Weekly recap
_Trigger:_ Weekly schedule

1. Generate 7-day summary per habit
2. Show completion rates and streak progress
3. Send encouraging milestone message if reached

_Data touched:_ Metrics, Instance

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — User profile with timezone and preferences
  - fields: telegram_id, display_name, timezone, recap_day, recap_time
- **Habit** _(retention: persistent)_ — User-created habit with schedule and milestones
  - fields: name, schedule_type, scheduled_time, timezone, active_status, milestone_settings
- **Instance** _(retention: persistent)_ — Daily/weekly habit completion records
  - fields: date, status, timestamp
- **Metrics** _(retention: persistent)_ — Streak and completion tracking
  - fields: current_streak, longest_streak, completion_rate

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Create/edit/delete habits
- Pause/resume habits
- Edit past day records
- Set custom milestones

## Notifications

- Daily check-in reminders
- Weekly recap summaries
- Milestone achievement notifications

## Permissions & privacy

- All data private by default
- No third-party sharing
- User can delete their data at any time

## Edge cases

- Timezone changes mid-tracking week
- Missed reminders due to Telegram inactivity
- Conflicting habit schedules on same day

## Required tests

- End-to-end weekly tracking flow with milestone trigger
- Timezone-aware reminder delivery test
- Data persistence after 30-day simulation

## Assumptions

- Default recap time is Sunday 18:00 local
- Milestone presets at 7/30/90 days
- 15-minute snooze delay for reminders
