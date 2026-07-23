import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { store } from "../data-store.js";

registerMainMenuItem({ label: "📊 Weekly recap", data: "recap:show", order: 30 });

const composer = new Composer<Ctx>();

composer.callbackQuery("recap:show", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.answerCallbackQuery();
  const chatId = ctx.chat.id;
  const habits = store.getHabits(chatId);

  if (habits.length === 0) {
    await ctx.reply("No habits to recap yet. Create one first!", {
      reply_markup: inlineKeyboard([[inlineButton("➕ New habit", "habit:create")], [inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const user = store.getUser(chatId);
  const tz = user?.timezone ?? "UTC";
  const today = new Date();
  const lines: string[] = [];

  lines.push("📊 Your Week in Review\n");

  for (const h of habits) {
    const m = store.getMetrics(chatId, h.id);
    const streak = m?.currentStreak ?? 0;
    const rate = m?.completionRate ?? 0;

    let doneCount = 0;
    let totalCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-CA", { timeZone: tz });
      const inst = store.getInstance(chatId, h.id, dateStr);
      if (inst) {
        totalCount++;
        if (inst.status === "done") doneCount++;
      }
    }

    const weekRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    lines.push(`📝 ${h.name}`);
    lines.push(`   This week: ${doneCount}/7 days · ${weekRate}%`);
    lines.push(`   🔥 Streak: ${streak} days · 📊 All-time: ${Math.round(rate * 100)}%`);
    lines.push("");
  }

  const milestones = habits.filter((h) => {
    const m = store.getMetrics(chatId, h.id);
    return m && h.milestoneSettings.includes(m.currentStreak);
  });

  if (milestones.length > 0) {
    lines.push("🎉 Milestone Achievements:");
    for (const h of milestones) {
      const m = store.getMetrics(chatId, h.id);
      lines.push(`   🏆 ${h.name} — ${m?.currentStreak}-day streak!`);
    }
    lines.push("");
  }

  lines.push("Keep going — every day counts! 💪");

  await ctx.reply(lines.join("\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
