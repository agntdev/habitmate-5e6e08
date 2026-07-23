import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../data-store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("habits:list", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat.id;
  const habits = store.getHabits(chatId);

  if (habits.length === 0) {
    await ctx.editMessageText("You haven't created any habits yet.\n\nTap ➕ New habit to start building one.", {
      reply_markup: inlineKeyboard([[inlineButton("➕ New habit", "habit:create")], [inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = habits.map((h) => {
    const m = store.getMetrics(chatId, h.id);
    const streak = m?.currentStreak ?? 0;
    const rate = m?.completionRate ?? 0;
    return `📝 ${h.name}\n   🔁 ${h.scheduleType} · ⏰ ${h.scheduledTime} · 🔥 ${streak} day streak · ${Math.round(rate * 100)}% done`;
  });

  const buttons = habits.map((h) => [inlineButton(`📝 ${h.name}`, `habit:view:${h.id}`)]);

  buttons.push([inlineButton("➕ New habit", "habit:create")]);
  buttons.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.editMessageText(
    `Your habits:\n\n${lines.join("\n\n")}`,
    { reply_markup: inlineKeyboard(buttons) },
  );
});

composer.callbackQuery(/^habit:view:(.+)$/, async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const match = ctx.match as RegExpMatchArray;
  const habitId = match[1];
  const chatId = ctx.chat.id;
  const habit = store.getHabitById(chatId, habitId);
  if (!habit) {
    await ctx.reply("That habit wasn't found. It may have been deleted.");
    return;
  }

  const m = store.getMetrics(chatId, habitId);
  const streak = m?.currentStreak ?? 0;
  const longest = m?.longestStreak ?? 0;
  const rate = m?.completionRate ?? 0;

  const today = getCurrentDate(chatId);
  const instance = store.getInstance(chatId, habitId, today);

  let statusText = "⏳ pending";
  if (instance?.status === "done") statusText = "✅ done";
  else if (instance?.status === "skip") statusText = "⏭️ skipped";

  const rows = [];
  if (!instance || instance.status === "pending" || instance.status === "snoozed") {
    rows.push([
      inlineButton("✅ Done", `habit:checkin:done:${habitId}`),
      inlineButton("⏭️ Skip", `habit:checkin:skip:${habitId}`),
      inlineButton("😴 Snooze", `habit:checkin:snooze:${habitId}`),
    ]);
  }
  rows.push([inlineButton("🗑️ Delete habit", `habit:delete:${habitId}`)]);
  rows.push([inlineButton("⬅️ Back to habits", "habits:list")]);

  await ctx.reply(
    `📝 ${habit.name}\n\n` +
    `🔁 ${habit.scheduleType} · ⏰ ${habit.scheduledTime}\n` +
    `🌍 ${habit.timezone}\n\n` +
    `🔥 Current streak: ${streak} days\n` +
    `🏆 Longest streak: ${longest} days\n` +
    `📊 Completion rate: ${Math.round(rate * 100)}%\n\n` +
    `Today: ${statusText}`,
    { reply_markup: inlineKeyboard(rows) },
  );
});

function getCurrentDate(chatId: number): string {
  const user = store.getUser(chatId);
  const tz = user?.timezone ?? "UTC";
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export default composer;
