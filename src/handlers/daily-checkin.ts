import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../data-store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery(/^habit:checkin:(done|skip|snooze):(.+)$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpMatchArray;
  const status = match[1] as "done" | "skip" | "snooze";
  const habitId = match[2];
  const chatId = ctx.chat.id;

  const habit = store.getHabitById(chatId, habitId);
  if (!habit) {
    await ctx.reply("That habit wasn't found. It may have been deleted.");
    return;
  }

  const today = getCurrentDate(chatId);
  const existing = store.getInstance(chatId, habitId, today);

  if (status === "snooze") {
    store.saveInstance(chatId, {
      id: existing?.id ?? `inst_${habitId}_${today}`,
      habitId,
      userId: chatId,
      date: today,
      status: "snoozed",
      timestamp: new Date().toISOString(),
    });
    await ctx.reply("Snoozed! I'll remind you again in 15 minutes.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  store.saveInstance(chatId, {
    id: existing?.id ?? `inst_${habitId}_${today}`,
    habitId,
    userId: chatId,
    date: today,
    status,
    timestamp: new Date().toISOString(),
  });

  updateMetrics(chatId, habitId, status === "done");

  if (status === "done") {
    const m = store.getMetrics(chatId, habitId);
    const streak = m?.currentStreak ?? 0;
    const milestones = habit.milestoneSettings;
    let milestoneMsg = "";
    if (milestones.includes(streak)) {
      milestoneMsg = `\n\n🎉 Amazing! You've hit a ${streak}-day milestone!`;
    }
    await ctx.reply(`Great job on "${habit.name}"! ${getEncouragement()}\n\n🔥 Current streak: ${streak} days${milestoneMsg}`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } else {
    await ctx.reply(`No worries — tomorrow is a new day! You can always come back to "${habit.name}".`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

function updateMetrics(chatId: number, habitId: string, isDone: boolean): void {
  const m = store.getMetrics(chatId, habitId);
  if (!m) return;

  const newStreak = isDone ? m.currentStreak + 1 : 0;
  const newLongest = Math.max(m.longestStreak, newStreak);
  const totalCompleted = m.completionRate * (m.currentStreak + m.longestStreak) + (isDone ? 1 : 0);
  const totalDays = m.currentStreak + m.longestStreak + (isDone ? 1 : 0);
  const newRate = totalDays > 0 ? totalCompleted / totalDays : 0;

  store.updateMetrics(chatId, habitId, {
    currentStreak: newStreak,
    longestStreak: newLongest,
    completionRate: Math.min(1, Math.max(0, newRate)),
  });
}

function getEncouragement(): string {
  const messages = [
    "Keep it up!",
    "You're doing great!",
    "One step at a time!",
    "Proud of you!",
    "Consistency is key!",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getCurrentDate(chatId: number): string {
  const user = store.getUser(chatId);
  const tz = user?.timezone ?? "UTC";
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export default composer;
